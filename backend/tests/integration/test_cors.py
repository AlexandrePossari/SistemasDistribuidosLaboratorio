import pytest
from fastapi.testclient import TestClient

from app.api.cors import get_cors_origins

# Mesma leitura feita pela aplicacao ao subir (padrao ou CORS_ORIGINS do ambiente).
ORIGEM_FRONTEND = get_cors_origins()[0]
ORIGEM_DESCONHECIDA = "http://site-malicioso.exemplo"


def _preflight(client: TestClient, origem: str, metodo: str = "POST"):
    return client.options(
        "/cars",
        headers={
            "Origin": origem,
            "Access-Control-Request-Method": metodo,
            "Access-Control-Request-Headers": "Content-Type",
        },
    )


@pytest.mark.parametrize("metodo", ["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_preflight_autoriza_origem_do_frontend(client: TestClient, metodo: str) -> None:
    response = _preflight(client, ORIGEM_FRONTEND, metodo)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGEM_FRONTEND
    assert metodo in response.headers["access-control-allow-methods"]


def test_preflight_recusa_origem_desconhecida(client: TestClient) -> None:
    response = _preflight(client, ORIGEM_DESCONHECIDA)

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_resposta_inclui_origem_permitida(client: TestClient) -> None:
    response = client.get("/", headers={"Origin": ORIGEM_FRONTEND})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGEM_FRONTEND


def test_resposta_nao_libera_origem_desconhecida(client: TestClient) -> None:
    response = client.get("/", headers={"Origin": ORIGEM_DESCONHECIDA})

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
