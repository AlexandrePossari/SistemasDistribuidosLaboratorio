from collections.abc import Callable
from datetime import date
from typing import Any

from app.models.livro import LivroModel
from app.repositories.livro import LivroRepository, TituloAutorDuplicadoError
from app.schemas.livro import (
    Livro,
    LivroCreate,
    LivroPatch,
    LivroUpdate,
    ResumoLeitura,
    StatusLeitura,
)


class LivroNaoEncontradoError(LookupError):
    def __init__(self, livro_id: int) -> None:
        super().__init__(f"Livro {livro_id} não encontrado")
        self.livro_id = livro_id


class LivroDuplicadoError(ValueError):
    def __init__(self, titulo: str, autor: str) -> None:
        super().__init__(f'Já existe um livro "{titulo}" de {autor}')


class AvaliacaoInvalidaError(ValueError):
    def __init__(self) -> None:
        super().__init__("Só é possível avaliar livros lidos")


class LivroService:
    """Regras de negocio dos livros.

    - um livro que passa a "lido" recebe a data de conclusao (hoje);
    - um livro que deixa de ser "lido" perde a avaliacao e a data de conclusao;
    - so livros lidos podem ser avaliados;
    - titulo + autor nao se repetem (sem diferenciar maiusculas).
    """

    def __init__(self, repository: LivroRepository, hoje: Callable[[], date] = date.today) -> None:
        self.repository = repository
        self.hoje = hoje

    def listar_livros(
        self, status: StatusLeitura | None = None, busca: str | None = None, limite: int = 50
    ) -> list[Livro]:
        livros = self.repository.listar(status=status, busca=busca, limite=limite)
        return [Livro.model_validate(livro) for livro in livros]

    def resumo(self) -> ResumoLeitura:
        contagem = self.repository.contar_por_status()
        por_status = {status.value: contagem.get(status.value, 0) for status in StatusLeitura}
        return ResumoLeitura(**por_status, total=sum(por_status.values()))

    def obter_livro(self, livro_id: int) -> Livro:
        return Livro.model_validate(self._buscar(livro_id))

    def criar_livro(self, dados: LivroCreate) -> Livro:
        campos = self._aplicar_regras(dados.model_dump(), atual=None)
        self._garantir_unico(campos["titulo"], campos["autor"])
        return Livro.model_validate(self._persistir(self.repository.criar, campos))

    def substituir_livro(self, livro_id: int, dados: LivroUpdate) -> Livro:
        livro = self._buscar(livro_id)
        campos = self._aplicar_regras(dados.model_dump(), atual=livro)
        self._garantir_unico(campos["titulo"], campos["autor"], ignorar_id=livro_id)
        atualizado = self._persistir(lambda c: self.repository.atualizar(livro, c), campos)
        return Livro.model_validate(atualizado)

    def atualizar_livro(self, livro_id: int, dados: LivroPatch) -> Livro:
        livro = self._buscar(livro_id)
        alteracoes = dados.model_dump(exclude_unset=True)
        # O estado final combina o que ja existe com o que foi enviado.
        final = {
            "titulo": livro.titulo,
            "autor": livro.autor,
            "status": livro.status,
            "avaliacao": livro.avaliacao,
            **alteracoes,
        }
        # Mudar o status sem mandar avaliacao nao "herda" a avaliacao antiga.
        if "status" in alteracoes and "avaliacao" not in alteracoes and final["status"] != "lido":
            final["avaliacao"] = None
        campos = self._aplicar_regras(final, atual=livro)
        if "titulo" in alteracoes or "autor" in alteracoes:
            self._garantir_unico(campos["titulo"], campos["autor"], ignorar_id=livro_id)
        atualizado = self._persistir(lambda c: self.repository.atualizar(livro, c), campos)
        return Livro.model_validate(atualizado)

    def remover_livro(self, livro_id: int) -> None:
        self.repository.remover(self._buscar(livro_id))

    def _aplicar_regras(self, campos: dict[str, Any], atual: LivroModel | None) -> dict[str, Any]:
        """Aplica as regras de status, avaliacao e data de conclusao ao estado final."""
        campos = dict(campos)
        status = StatusLeitura(campos["status"])
        campos["status"] = status.value

        if status is StatusLeitura.LIDO:
            ja_estava_lido = atual is not None and atual.status == StatusLeitura.LIDO
            campos["concluido_em"] = atual.concluido_em if ja_estava_lido else self.hoje()
        else:
            if campos.get("avaliacao") is not None:
                raise AvaliacaoInvalidaError()
            campos["avaliacao"] = None
            campos["concluido_em"] = None
        return campos

    def _garantir_unico(self, titulo: str, autor: str, ignorar_id: int | None = None) -> None:
        if self.repository.existe_titulo_autor(titulo, autor, ignorar_id=ignorar_id):
            raise LivroDuplicadoError(titulo, autor)

    def _persistir(
        self, operacao: Callable[[dict[str, Any]], LivroModel], campos: dict[str, Any]
    ) -> LivroModel:
        # O indice unico do banco cobre o caso de dois cadastros iguais ao mesmo tempo.
        try:
            return operacao(campos)
        except TituloAutorDuplicadoError as erro:
            raise LivroDuplicadoError(campos["titulo"], campos["autor"]) from erro

    def _buscar(self, livro_id: int) -> LivroModel:
        livro = self.repository.obter(livro_id)
        if livro is None:
            raise LivroNaoEncontradoError(livro_id)
        return livro
