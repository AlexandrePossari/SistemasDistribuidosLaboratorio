import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.database.session import get_db
from app.main import app

BACKEND_DIR = Path(__file__).resolve().parents[2]

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/sistemas_distribuidos_test",
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
def alembic_config() -> Config:
    config = Config(BACKEND_DIR / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    return config


@pytest.fixture(scope="session")
def engine_teste(alembic_config: Config) -> Iterator[Engine]:
    """Garante o banco de teste no PostgreSQL com todas as migrations aplicadas."""
    try:
        _criar_banco_se_nao_existir(TEST_DATABASE_URL)
        command.upgrade(alembic_config, "head")
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
def banco(engine_teste: Engine) -> Iterator[sessionmaker[Session]]:
    """Banco de teste limpo; a API passa a usar sessoes ligadas a ele."""
    with engine_teste.begin() as conexao:
        conexao.execute(text("TRUNCATE TABLE cars RESTART IDENTITY"))

    fabrica = sessionmaker(bind=engine_teste, autoflush=False, expire_on_commit=False)

    def _get_db_teste() -> Iterator[Session]:
        with fabrica() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_teste
    yield fabrica
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def db_session(banco: sessionmaker[Session]) -> Iterator[Session]:
    with banco() as session:
        yield session


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def somar(client: TestClient) -> Callable:
    def _somar(a: object, b: object):
        return client.get("/soma", params={"a": a, "b": b})

    return _somar


@pytest.fixture
def dividir(client: TestClient) -> Callable:
    def _dividir(a: object, b: object):
        return client.get("/divisao", params={"a": a, "b": b})

    return _dividir


@pytest.fixture
def carro_payload() -> dict:
    return {
        "marca": "Fiat",
        "modelo": "Uno",
        "ano": 2010,
        "cor": "Vermelho",
        "preco": 25000.0,
    }
