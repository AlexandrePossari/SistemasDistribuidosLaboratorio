"""cria tabela livros

Tabela de livros com as regras de status e avaliacao garantidas por CHECK constraints
e o indice unico de titulo + autor (sem diferenciar maiusculas).

Revision ID: 0001
Revises:
Create Date: 2026-11-12 12:29:39.490620

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "livros",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=False),
        sa.Column("autor", sa.String(length=120), nullable=False),
        sa.Column("notas", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="quero_ler", nullable=False),
        sa.Column("avaliacao", sa.SmallInteger(), nullable=True),
        sa.Column("concluido_em", sa.Date(), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(status = 'lido') = (concluido_em IS NOT NULL)",
            name=op.f("ck_livros_concluido_em_so_em_livro_lido"),
        ),
        sa.CheckConstraint(
            "avaliacao IS NULL OR status = 'lido'",
            name=op.f("ck_livros_avaliacao_so_em_livro_lido"),
        ),
        sa.CheckConstraint(
            "status IN ('quero_ler', 'lendo', 'lido')", name=op.f("ck_livros_status_valido")
        ),
        sa.CheckConstraint(
            "avaliacao BETWEEN 1 AND 5", name=op.f("ck_livros_avaliacao_entre_1_e_5")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_livros")),
    )
    op.create_index(
        "uq_livros_titulo_autor",
        "livros",
        [sa.literal_column("lower(titulo)"), sa.literal_column("lower(autor)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_livros_titulo_autor", table_name="livros")
    op.drop_table("livros")
