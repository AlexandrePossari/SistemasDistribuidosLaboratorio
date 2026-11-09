from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect


def test_migrations_criam_tabela_de_carros(engine_teste: Engine) -> None:
    colunas = {coluna["name"] for coluna in inspect(engine_teste).get_columns("cars")}

    assert colunas == {"id", "marca", "modelo", "ano", "cor", "preco"}


def test_modelos_orm_estao_sincronizados_com_as_migrations(
    engine_teste: Engine, alembic_config: Config
) -> None:
    command.check(alembic_config)
