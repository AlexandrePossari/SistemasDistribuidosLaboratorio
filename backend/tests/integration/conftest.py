import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.database.session import get_db
from app.main import app

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/biblioteca_test",
)


def _criar_banco_se_nao_existir(url: str) -> None:
    url_banco = make_url(url)
    servidor = create_engine(
        url_banco.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
        connect_args={"connect_timeout": 5},
    )
    try:
        with servidor.connect() as conexao:
            existe = conexao.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :nome"),
                {"nome": url_banco.database},
            )
            if not existe:
                conexao.execute(text(f'CREATE DATABASE "{url_banco.database}"'))
    finally:
        servidor.dispose()


@pytest.fixture(scope="session")
def engine_teste() -> Iterator[Engine]:
    """Banco de teste separado no PostgreSQL, criado na primeira execucao."""
    try:
        _criar_banco_se_nao_existir(TEST_DATABASE_URL)
    except OperationalError as erro:
        pytest.fail(
            "Nao foi possivel conectar ao PostgreSQL de teste "
            f"({make_url(TEST_DATABASE_URL).render_as_string(hide_password=True)}). "
            "Suba o banco com `make up` antes de rodar os testes de integracao.\n"
            f"{erro}"
        )

    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def client(engine_teste: Engine) -> Iterator[TestClient]:
    """Cliente HTTP da API usando o banco de teste no lugar do banco da aplicacao."""
    fabrica = sessionmaker(bind=engine_teste, autoflush=False, expire_on_commit=False)

    def _get_db_teste() -> Iterator[Session]:
        with fabrica() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_teste
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
