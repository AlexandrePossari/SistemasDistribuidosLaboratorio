from collections.abc import Callable

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.main import divisao, soma


@pytest.mark.parametrize(
    ("a", "b", "esperado"),
    [
        (1, 2, 3),
        (0, 0, 0),
        (-5, 5, 0),
        (2.5, 2.5, 5.0),
        (-3, -7, -10),
    ],
)
def test_soma_retorna_resultado(somar: Callable, a: float, b: float, esperado: float) -> None:
    response = somar(a, b)

    assert response.status_code == 200
    assert response.json() == {"resultado": pytest.approx(esperado)}


@pytest.mark.parametrize(
    ("a", "b", "esperado"),
    [
        (10, 2, 5.0),
        (7, 2, 3.5),
        (-9, 3, -3.0),
        (0, 4, 0.0),
        (1, 3, 0.3333333333333333),
    ],
)
def test_divisao_retorna_resultado(dividir: Callable, a: float, b: float, esperado: float) -> None:
    response = dividir(a, b)

    assert response.status_code == 200
    assert response.json()["resultado"] == pytest.approx(esperado)


@pytest.mark.parametrize("a", [1, 0, -42, 3.5])
def test_divisao_por_zero_retorna_400(dividir: Callable, a: float) -> None:
    response = dividir(a, 0)

    assert response.status_code == 400
    assert response.json() == {"detail": "Divisao por zero nao e permitida"}


@pytest.mark.parametrize("rota", ["/soma", "/divisao"])
@pytest.mark.parametrize("params", [{}, {"a": 1}, {"b": 2}])
def test_operacoes_exigem_os_dois_parametros(
    client: TestClient, rota: str, params: dict
) -> None:
    response = client.get(rota, params=params)

    assert response.status_code == 422


@pytest.mark.parametrize("rota", ["/soma", "/divisao"])
def test_operacoes_rejeitam_parametro_nao_numerico(client: TestClient, rota: str) -> None:
    response = client.get(rota, params={"a": "abc", "b": 2})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "a"]


@pytest.mark.parametrize(("a", "b"), [(1, 2), (-4, 9), (0.5, 0.25)])
def test_soma_e_comutativa(somar: Callable, a: float, b: float) -> None:
    assert somar(a, b).json() == somar(b, a).json()


def test_funcoes_de_operacao_sem_camada_http() -> None:
    assert soma(2, 3) == {"resultado": 5}
    assert divisao(9, 3) == {"resultado": 3.0}


def test_divisao_levanta_erro_sem_camada_http() -> None:
    with pytest.raises(HTTPException) as excinfo:
        divisao(1, 0)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Divisao por zero nao e permitida"


@pytest.mark.parametrize("rota", ["/soma", "/divisao"])
@pytest.mark.parametrize("metodo", ["post", "put", "patch", "delete"])
def test_operacoes_rejeitam_metodos_nao_suportados(
    client: TestClient, rota: str, metodo: str
) -> None:
    response = getattr(client, metodo)(rota)

    assert response.status_code == 405


@pytest.mark.parametrize("rota", ["/", "/soma", "/divisao"])
def test_rotas_documentadas_no_openapi(client: TestClient, rota: str) -> None:
    schema = client.get("/openapi.json").json()

    assert rota in schema["paths"]
    assert "get" in schema["paths"][rota]


def test_root_continua_respondendo_ok(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
