import pytest
from fastapi.testclient import TestClient

from app.api.cors import get_cors_origins

# A mesma leitura que a aplicacao fez ao subir (padrao ou CORS_ORIGINS do ambiente).
ORIGEM_FRONTEND = get_cors_origins()[0]
ORIGEM_DESCONHECIDA = "http://site-desconhecido.exemplo"


def _preflight(client: TestClient, origem: str, metodo: str):
    return client.options(
        "/livros",
        headers={
            "Origin": origem,
            "Access-Control-Request-Method": metodo,
            "Access-Control-Request-Headers": "Content-Type",
        },
    )


@pytest.mark.parametrize("metodo", ["GET", "POST", "PUT", "PATCH", "DELETE"])
def test_preflight_libera_a_origem_do_frontend(client: TestClient, metodo: str) -> None:
    response = _preflight(client, ORIGEM_FRONTEND, metodo)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGEM_FRONTEND
    assert metodo in response.headers["access-control-allow-methods"]


def test_preflight_recusa_origem_desconhecida(client: TestClient) -> None:
    response = _preflight(client, ORIGEM_DESCONHECIDA, "POST")

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_preflight_recusa_metodo_nao_usado(client: TestClient) -> None:
    assert _preflight(client, ORIGEM_FRONTEND, "TRACE").status_code == 400


def test_resposta_libera_so_a_origem_permitida(client: TestClient) -> None:
    permitida = client.get("/livros", headers={"Origin": ORIGEM_FRONTEND})
    desconhecida = client.get("/livros", headers={"Origin": ORIGEM_DESCONHECIDA})

    assert permitida.headers["access-control-allow-origin"] == ORIGEM_FRONTEND
    assert "access-control-allow-origin" not in desconhecida.headers
