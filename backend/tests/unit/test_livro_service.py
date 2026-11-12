from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from app.models.livro import LivroModel
from app.repositories.livro import TituloAutorDuplicadoError
from app.schemas.livro import LivroCreate, LivroPatch, LivroUpdate
from app.services.livro import (
    AvaliacaoInvalidaError,
    LivroDuplicadoError,
    LivroNaoEncontradoError,
    LivroService,
)

HOJE = date(2026, 11, 12)


class RepositorioEmMemoria:
    """Repository falso: guarda os livros num dicionario, sem banco."""

    def __init__(self) -> None:
        self.livros: dict[int, LivroModel] = {}
        self.proximo_id = 1
        self.relogio = datetime(2026, 1, 1, tzinfo=UTC)
        self.simular_corrida = False

    def _agora(self) -> datetime:
        self.relogio += timedelta(seconds=1)
        return self.relogio

    def listar(self, status=None, busca=None, limite=50) -> list[LivroModel]:
        livros = [
            livro
            for livro in self.livros.values()
            if (status is None or livro.status == status)
            and (not busca or busca.lower() in f"{livro.titulo} {livro.autor}".lower())
        ]
        return sorted(livros, key=lambda livro: livro.criado_em, reverse=True)[:limite]

    def obter(self, livro_id: int) -> LivroModel | None:
        return self.livros.get(livro_id)

    def existe_titulo_autor(self, titulo: str, autor: str, ignorar_id: int | None = None) -> bool:
        return any(
            livro.titulo.lower() == titulo.lower()
            and livro.autor.lower() == autor.lower()
            and livro.id != ignorar_id
            for livro in self.livros.values()
        )

    def criar(self, dados: dict[str, Any]) -> LivroModel:
        if self.simular_corrida:
            raise TituloAutorDuplicadoError
        agora = self._agora()
        livro = LivroModel(**dados, id=self.proximo_id, criado_em=agora, atualizado_em=agora)
        self.livros[livro.id] = livro
        self.proximo_id += 1
        return livro

    def atualizar(self, livro: LivroModel, dados: dict[str, Any]) -> LivroModel:
        for campo, valor in dados.items():
            setattr(livro, campo, valor)
        livro.atualizado_em = self._agora()
        return livro

    def remover(self, livro: LivroModel) -> None:
        del self.livros[livro.id]


class Relogio:
    """Data de "hoje" controlada pelo teste."""

    def __init__(self) -> None:
        self.data = HOJE

    def __call__(self) -> date:
        return self.data


@pytest.fixture
def repositorio() -> RepositorioEmMemoria:
    return RepositorioEmMemoria()


@pytest.fixture
def relogio() -> Relogio:
    return Relogio()


@pytest.fixture
def service(repositorio: RepositorioEmMemoria, relogio: Relogio) -> LivroService:
    return LivroService(repositorio, hoje=relogio)


def _criar(service: LivroService, **dados):
    return service.criar_livro(LivroCreate(**{"titulo": "Duna", "autor": "Frank Herbert", **dados}))


# Cadastro


def test_cadastro_comeca_em_quero_ler_sem_avaliacao_nem_conclusao(service: LivroService) -> None:
    livro = _criar(service)

    assert livro.status == "quero_ler"
    assert livro.avaliacao is None
    assert livro.concluido_em is None


def test_cadastrar_livro_lido_registra_conclusao_hoje(service: LivroService) -> None:
    livro = _criar(service, status="lido", avaliacao=5)

    assert livro.concluido_em == HOJE
    assert livro.avaliacao == 5


@pytest.mark.parametrize("status", ["quero_ler", "lendo"])
def test_nao_permite_avaliar_livro_nao_lido_no_cadastro(service: LivroService, status: str) -> None:
    with pytest.raises(AvaliacaoInvalidaError, match="Só é possível avaliar livros lidos"):
        _criar(service, status=status, avaliacao=4)


def test_recusa_titulo_e_autor_repetidos_sem_diferenciar_maiusculas(
    service: LivroService,
) -> None:
    _criar(service)

    with pytest.raises(LivroDuplicadoError, match='Já existe um livro "DUNA" de frank herbert'):
        _criar(service, titulo="DUNA", autor="frank herbert")


def test_mesmo_titulo_de_outro_autor_e_permitido(service: LivroService) -> None:
    _criar(service)

    assert _criar(service, autor="Outro Autor").id == 2


def test_duplicidade_detectada_pelo_banco_vira_erro_de_dominio(
    service: LivroService, repositorio: RepositorioEmMemoria
) -> None:
    # Dois cadastros iguais ao mesmo tempo: o indice unico do banco recusa o segundo.
    repositorio.simular_corrida = True

    with pytest.raises(LivroDuplicadoError):
        _criar(service)


# Mudanca de status e avaliacao (PATCH)


def test_marcar_como_lido_registra_conclusao(service: LivroService) -> None:
    livro = _criar(service, status="lendo")

    lido = service.atualizar_livro(livro.id, LivroPatch(status="lido"))

    assert lido.status == "lido"
    assert lido.concluido_em == HOJE
    assert lido.avaliacao is None


def test_avaliar_livro_lido(service: LivroService) -> None:
    livro = _criar(service, status="lido")

    avaliado = service.atualizar_livro(livro.id, LivroPatch(avaliacao=4))

    assert avaliado.avaliacao == 4
    assert avaliado.concluido_em == HOJE


def test_avaliar_livro_nao_lido_e_recusado_e_nada_muda(
    service: LivroService, repositorio: RepositorioEmMemoria
) -> None:
    livro = _criar(service, status="lendo")

    with pytest.raises(AvaliacaoInvalidaError):
        service.atualizar_livro(livro.id, LivroPatch(avaliacao=3))

    assert repositorio.obter(livro.id).avaliacao is None


def test_mudar_para_nao_lido_junto_com_avaliacao_e_recusado(service: LivroService) -> None:
    livro = _criar(service, status="lido", avaliacao=5)

    with pytest.raises(AvaliacaoInvalidaError):
        service.atualizar_livro(livro.id, LivroPatch(status="lendo", avaliacao=3))


@pytest.mark.parametrize("novo_status", ["lendo", "quero_ler"])
def test_deixar_de_ser_lido_limpa_avaliacao_e_conclusao(
    service: LivroService, novo_status: str
) -> None:
    livro = _criar(service, status="lido", avaliacao=5)

    atualizado = service.atualizar_livro(livro.id, LivroPatch(status=novo_status))

    assert atualizado.status == novo_status
    assert atualizado.avaliacao is None
    assert atualizado.concluido_em is None


def test_remover_avaliacao_com_null_mantem_o_livro_lido(service: LivroService) -> None:
    livro = _criar(service, status="lido", avaliacao=2)

    atualizado = service.atualizar_livro(livro.id, LivroPatch(avaliacao=None))

    assert atualizado.avaliacao is None
    assert atualizado.status == "lido"
    assert atualizado.concluido_em == HOJE


def test_livro_que_continua_lido_mantem_a_data_original(
    service: LivroService, relogio: Relogio
) -> None:
    livro = _criar(service, status="lido")
    relogio.data = HOJE + timedelta(days=10)

    editado = service.atualizar_livro(livro.id, LivroPatch(notas="Gostei do final."))

    assert editado.concluido_em == HOJE


def test_voltar_a_ser_lido_registra_nova_data(service: LivroService, relogio: Relogio) -> None:
    livro = _criar(service, status="lido", avaliacao=4)
    service.atualizar_livro(livro.id, LivroPatch(status="lendo"))
    relogio.data = HOJE + timedelta(days=30)

    relido = service.atualizar_livro(livro.id, LivroPatch(status="lido"))

    assert relido.concluido_em == HOJE + timedelta(days=30)
    assert relido.avaliacao is None


def test_patch_que_repete_titulo_e_autor_de_outro_livro_e_recusado(service: LivroService) -> None:
    _criar(service)
    outro = _criar(service, titulo="Fundação", autor="Isaac Asimov")

    with pytest.raises(LivroDuplicadoError):
        service.atualizar_livro(outro.id, LivroPatch(titulo="Duna", autor="Frank Herbert"))


# Edicao completa (PUT)


def test_substituir_troca_todos_os_campos(service: LivroService) -> None:
    livro = _criar(service, notas="antiga")

    editado = service.substituir_livro(
        livro.id,
        LivroUpdate(titulo="Duna Messias", autor="Frank Herbert", status="lido", avaliacao=3),
    )

    assert (editado.titulo, editado.notas, editado.status) == ("Duna Messias", "", "lido")
    assert editado.avaliacao == 3
    assert editado.concluido_em == HOJE


def test_substituir_mantendo_titulo_e_autor_do_proprio_livro_e_permitido(
    service: LivroService,
) -> None:
    livro = _criar(service)

    editado = service.substituir_livro(
        livro.id, LivroUpdate(titulo="duna", autor="FRANK HERBERT", notas="nova nota")
    )

    assert editado.notas == "nova nota"


def test_substituir_com_avaliacao_em_livro_nao_lido_e_recusado(service: LivroService) -> None:
    livro = _criar(service, status="lido", avaliacao=5)

    with pytest.raises(AvaliacaoInvalidaError):
        service.substituir_livro(
            livro.id, LivroUpdate(titulo="Duna", autor="Frank Herbert", status="lendo", avaliacao=5)
        )


# Consulta e remocao


def test_listar_traz_os_mais_recentes_primeiro(service: LivroService) -> None:
    _criar(service, titulo="Primeiro")
    _criar(service, titulo="Segundo")

    assert [livro.titulo for livro in service.listar_livros()] == ["Segundo", "Primeiro"]


def test_remover_apaga_o_livro(service: LivroService, repositorio: RepositorioEmMemoria) -> None:
    livro = _criar(service)

    service.remover_livro(livro.id)

    assert repositorio.obter(livro.id) is None


@pytest.mark.parametrize(
    "operacao",
    [
        lambda s: s.obter_livro(99),
        lambda s: s.atualizar_livro(99, LivroPatch(status="lido")),
        lambda s: s.substituir_livro(99, LivroUpdate(titulo="X", autor="Y")),
        lambda s: s.remover_livro(99),
    ],
)
def test_livro_inexistente_gera_erro(service: LivroService, operacao) -> None:
    with pytest.raises(LivroNaoEncontradoError, match="Livro 99 não encontrado"):
        operacao(service)
