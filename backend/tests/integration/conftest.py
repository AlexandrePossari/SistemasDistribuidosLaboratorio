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
def alembic_config() -> Config:
    """Configuracao do Alembic apontando para o banco de teste."""
    config = Config(BACKEND_DIR / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    return config


@pytest.fixture(scope="session")
def engine_teste(alembic_config: Config) -> Iterator[Engine]:
    """Banco de teste separado no PostgreSQL, criado e migrado com as migrations reais."""
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
def fabrica_sessoes(engine_teste: Engine) -> sessionmaker[Session]:
    """Tabela de livros vazia (ids reiniciados) antes de cada teste."""
    with engine_teste.begin() as conexao:
        conexao.execute(text("TRUNCATE TABLE livros RESTART IDENTITY"))
    return sessionmaker(bind=engine_teste, autoflush=False, expire_on_commit=False)


@pytest.fixture
def db_session(fabrica_sessoes: sessionmaker[Session]) -> Iterator[Session]:
    with fabrica_sessoes() as session:
        yield session


@pytest.fixture
def client(fabrica_sessoes: sessionmaker[Session]) -> Iterator[TestClient]:
    """Cliente HTTP da API usando o banco de teste no lugar do banco da aplicacao."""

    def _get_db_teste() -> Iterator[Session]:
        with fabrica_sessoes() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db_teste
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def livro_payload() -> dict:
    return {
        "titulo": "O Hobbit",
        "autor": "J. R. R. Tolkien",
        "notas": "Releitura antes do Senhor dos Anéis.",
        "status": "quero_ler",
    }


@pytest.fixture
def cadastrar(client: TestClient) -> Callable[..., dict]:
    """Cadastra um livro pela API e devolve o JSON criado."""

    def _cadastrar(**dados) -> dict:
        payload = {"titulo": "Livro", "autor": "Autor", **dados}
        response = client.post("/livros", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _cadastrar
