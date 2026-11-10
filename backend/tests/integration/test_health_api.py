from collections.abc import Iterator

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.database.session import get_db
from app.main import app


def test_raiz_aponta_para_a_documentacao(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"nome": "Minha Biblioteca API", "docs": "/docs"}


def test_health_confirma_conexao_com_o_banco(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "banco": "ok"}


class _SessaoSemBanco:
    """Sessao falsa que simula o PostgreSQL fora do ar."""

    def execute(self, *_args, **_kwargs):
        raise OperationalError("SELECT 1", {}, Exception("conexao recusada"))


def test_health_retorna_503_quando_o_banco_esta_fora_do_ar() -> None:
    def _get_db_sem_banco() -> Iterator[_SessaoSemBanco]:
        yield _SessaoSemBanco()

    app.dependency_overrides[get_db] = _get_db_sem_banco
    try:
        with TestClient(app) as client:
            response = client.get("/health")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    assert response.json() == {"status": "erro", "banco": "indisponivel"}


def test_documentacao_openapi_lista_o_health(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Minha Biblioteca API"
    assert "/health" in response.json()["paths"]
