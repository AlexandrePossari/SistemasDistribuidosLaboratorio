from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Index, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class LivroModel(Base):
    __tablename__ = "livros"
    __table_args__ = (
        CheckConstraint("status IN ('quero_ler', 'lendo', 'lido')", name="status_valido"),
        CheckConstraint("avaliacao BETWEEN 1 AND 5", name="avaliacao_entre_1_e_5"),
        # As regras de negocio tambem ficam garantidas no banco:
        # so livros lidos tem avaliacao, e todo livro lido tem data de conclusao.
        CheckConstraint("avaliacao IS NULL OR status = 'lido'", name="avaliacao_so_em_livro_lido"),
        CheckConstraint(
            "(status = 'lido') = (concluido_em IS NOT NULL)",
            name="concluido_em_so_em_livro_lido",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200))
    autor: Mapped[str] = mapped_column(String(120))
    notas: Mapped[str] = mapped_column(Text, default="", server_default="")
    status: Mapped[str] = mapped_column(String(20), default="quero_ler", server_default="quero_ler")
    avaliacao: Mapped[int | None] = mapped_column(SmallInteger)
    concluido_em: Mapped[date | None] = mapped_column(Date)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Mesmo titulo + autor, sem diferenciar maiusculas, nao pode se repetir.
Index(
    "uq_livros_titulo_autor",
    func.lower(LivroModel.titulo),
    func.lower(LivroModel.autor),
    unique=True,
)
