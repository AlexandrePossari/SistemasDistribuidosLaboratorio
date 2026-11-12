from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.livro import LivroModel


class TituloAutorDuplicadoError(Exception):
    """O banco recusou o registro pelo indice unico de titulo + autor."""


class LivroRepository:
    """Acesso aos livros no banco: unica camada que conhece o SQLAlchemy."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def listar(
        self, status: str | None = None, busca: str | None = None, limite: int = 50
    ) -> list[LivroModel]:
        consulta = select(LivroModel)
        if status is not None:
            consulta = consulta.where(LivroModel.status == status)
        if busca:
            # % e _ digitados na busca sao texto, nao curingas do LIKE.
            literal = busca.lower().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            termo = f"%{literal}%"
            consulta = consulta.where(
                or_(
                    func.lower(LivroModel.titulo).like(termo, escape="\\"),
                    func.lower(LivroModel.autor).like(termo, escape="\\"),
                )
            )
        mais_recentes_primeiro = (LivroModel.criado_em.desc(), LivroModel.id.desc())
        consulta = consulta.order_by(*mais_recentes_primeiro).limit(limite)
        return list(self.session.scalars(consulta))

    def obter(self, livro_id: int) -> LivroModel | None:
        return self.session.get(LivroModel, livro_id)

    def existe_titulo_autor(self, titulo: str, autor: str, ignorar_id: int | None = None) -> bool:
        """Indica se ja existe outro livro com o mesmo titulo e autor (ignora maiusculas)."""
        consulta = select(LivroModel.id).where(
            func.lower(LivroModel.titulo) == titulo.lower(),
            func.lower(LivroModel.autor) == autor.lower(),
        )
        if ignorar_id is not None:
            consulta = consulta.where(LivroModel.id != ignorar_id)
        return self.session.scalar(consulta.limit(1)) is not None

    def criar(self, dados: dict[str, Any]) -> LivroModel:
        livro = LivroModel(**dados)
        self.session.add(livro)
        self._salvar()
        self.session.refresh(livro)
        return livro

    def atualizar(self, livro: LivroModel, dados: dict[str, Any]) -> LivroModel:
        for campo, valor in dados.items():
            setattr(livro, campo, valor)
        self._salvar()
        self.session.refresh(livro)
        return livro

    def remover(self, livro: LivroModel) -> None:
        self.session.delete(livro)
        self.session.commit()

    def _salvar(self) -> None:
        try:
            self.session.commit()
        except IntegrityError as erro:
            self.session.rollback()
            if "uq_livros_titulo_autor" in str(erro.orig):
                raise TituloAutorDuplicadoError from erro
            raise
