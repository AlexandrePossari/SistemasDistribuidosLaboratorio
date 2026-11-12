from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import Engine, inspect

from app.database.base import Base


def test_banco_de_teste_esta_na_ultima_migration(
    engine_teste: Engine, alembic_config: Config
) -> None:
    head = ScriptDirectory.from_config(alembic_config).get_current_head()

    with engine_teste.connect() as conexao:
        atual = MigrationContext.configure(conexao).get_current_revision()

    assert atual == head


def test_modelos_e_migrations_estao_sincronizados(engine_teste: Engine) -> None:
    """Falha se um modelo mudar sem uma migration nova (alembic revision --autogenerate)."""
    with engine_teste.connect() as conexao:
        diferencas = compare_metadata(MigrationContext.configure(conexao), Base.metadata)

    assert diferencas == []


def test_migration_cria_tabela_indice_e_constraints(engine_teste: Engine) -> None:
    inspetor = inspect(engine_teste)

    assert "livros" in inspetor.get_table_names()
    indices = {indice["name"]: indice for indice in inspetor.get_indexes("livros")}
    assert indices["uq_livros_titulo_autor"]["unique"] is True
    assert {check["name"] for check in inspetor.get_check_constraints("livros")} == {
        "ck_livros_status_valido",
        "ck_livros_avaliacao_entre_1_e_5",
        "ck_livros_avaliacao_so_em_livro_lido",
        "ck_livros_concluido_em_so_em_livro_lido",
    }


def test_downgrade_e_upgrade_da_migration(engine_teste: Engine, alembic_config: Config) -> None:
    command.downgrade(alembic_config, "base")
    try:
        assert "livros" not in inspect(engine_teste).get_table_names()
    finally:
        command.upgrade(alembic_config, "head")

    assert "livros" in inspect(engine_teste).get_table_names()
