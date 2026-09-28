import pytest
from fastapi.testclient import TestClient

from app.services.car import CARROS_EXEMPLO, ID_NOVO_CARRO

CAMPOS_CARRO = {"id", "marca", "modelo", "ano", "cor", "preco"}


# GET /cars


def test_listar_carros_retorna_lista(client: TestClient) -> None:
    response = client.get("/cars")

    assert response.status_code == 200
    corpo = response.json()
    assert len(corpo) == len(CARROS_EXEMPLO)
    assert all(set(carro) == CAMPOS_CARRO for carro in corpo)


@pytest.mark.parametrize("marca", ["Toyota", "toyota", "TOYOTA"])
def test_listar_carros_filtra_por_marca_via_query(client: TestClient, marca: str) -> None:
    response = client.get("/cars", params={"marca": marca})

    assert response.status_code == 200
    corpo = response.json()
    assert len(corpo) == 2
    assert {carro["marca"] for carro in corpo} == {"Toyota"}


def test_listar_carros_marca_inexistente_retorna_lista_vazia(client: TestClient) -> None:
    response = client.get("/cars", params={"marca": "Ferrari"})

    assert response.status_code == 200
    assert response.json() == []


def test_listar_carros_respeita_limite_via_query(client: TestClient) -> None:
    response = client.get("/cars", params={"limite": 2})

    assert response.status_code == 200
    assert [carro["id"] for carro in response.json()] == [1, 2]


@pytest.mark.parametrize("params", [{"limite": 0}, {"limite": 101}, {"limite": "abc"}, {"marca": ""}])
def test_listar_carros_rejeita_query_invalida(client: TestClient, params: dict) -> None:
    response = client.get("/cars", params=params)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][0] == "query"


# GET /cars/{car_id}


@pytest.mark.parametrize("car_id", [1, 7, 999])
def test_obter_carro_usa_id_do_path(client: TestClient, car_id: int) -> None:
    response = client.get(f"/cars/{car_id}")

    assert response.status_code == 200
    corpo = response.json()
    assert corpo["id"] == car_id
    assert set(corpo) == CAMPOS_CARRO


@pytest.mark.parametrize("car_id", ["0", "-1", "abc"])
def test_obter_carro_rejeita_id_invalido(client: TestClient, car_id: str) -> None:
    response = client.get(f"/cars/{car_id}")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# POST /cars


def test_criar_carro_retorna_201(client: TestClient, carro_payload: dict) -> None:
    response = client.post("/cars", json=carro_payload)

    assert response.status_code == 201
    assert response.json() == {"id": ID_NOVO_CARRO, **carro_payload}


@pytest.mark.parametrize("campo", ["marca", "modelo", "ano", "cor", "preco"])
def test_criar_carro_exige_todos_os_campos(
    client: TestClient, carro_payload: dict, campo: str
) -> None:
    carro_payload.pop(campo)

    response = client.post("/cars", json=carro_payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", campo]


@pytest.mark.parametrize(
    ("campo", "valor"),
    [("ano", 1800), ("ano", "novo"), ("preco", 0), ("preco", -10), ("marca", "")],
)
def test_criar_carro_valida_campos(
    client: TestClient, carro_payload: dict, campo: str, valor: object
) -> None:
    carro_payload[campo] = valor

    response = client.post("/cars", json=carro_payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", campo]


# PUT /cars/{car_id}


def test_substituir_carro_retorna_dados_enviados(client: TestClient, carro_payload: dict) -> None:
    response = client.put("/cars/5", json=carro_payload)

    assert response.status_code == 200
    assert response.json() == {"id": 5, **carro_payload}


def test_substituir_carro_exige_corpo_completo(client: TestClient) -> None:
    response = client.put("/cars/5", json={"cor": "Verde"})

    assert response.status_code == 422


def test_substituir_carro_rejeita_id_invalido(client: TestClient, carro_payload: dict) -> None:
    response = client.put("/cars/0", json=carro_payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# PATCH /cars/{car_id}


def test_atualizar_carro_altera_apenas_campos_enviados(client: TestClient) -> None:
    original = client.get("/cars/3").json()

    response = client.patch("/cars/3", json={"cor": "Verde", "preco": 99999.0})

    assert response.status_code == 200
    assert response.json() == {**original, "cor": "Verde", "preco": 99999.0}


def test_atualizar_carro_com_corpo_vazio_nao_altera_nada(client: TestClient) -> None:
    original = client.get("/cars/3").json()

    response = client.patch("/cars/3", json={})

    assert response.status_code == 200
    assert response.json() == original


@pytest.mark.parametrize(
    "corpo", [{"ano": 1500}, {"preco": 0}, {"marca": ""}, {"campo_inexistente": 1}]
)
def test_atualizar_carro_valida_campos(client: TestClient, corpo: dict) -> None:
    response = client.patch("/cars/3", json=corpo)

    assert response.status_code == 422


def test_atualizar_carro_rejeita_id_invalido(client: TestClient) -> None:
    response = client.patch("/cars/-1", json={"cor": "Verde"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# DELETE /cars/{car_id}


def test_remover_carro_retorna_204_sem_corpo(client: TestClient) -> None:
    response = client.delete("/cars/1")

    assert response.status_code == 204
    assert response.content == b""


def test_remover_carro_rejeita_id_invalido(client: TestClient) -> None:
    response = client.delete("/cars/abc")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# Contrato


def test_colecao_de_carros_nao_aceita_put_patch_delete(client: TestClient) -> None:
    for metodo in ("put", "patch", "delete"):
        assert getattr(client, metodo)("/cars").status_code == 405


def test_item_de_carro_nao_aceita_post(client: TestClient) -> None:
    assert client.post("/cars/1").status_code == 405


@pytest.mark.parametrize(
    ("rota", "metodos"),
    [("/cars", {"get", "post"}), ("/cars/{car_id}", {"get", "put", "patch", "delete"})],
)
def test_rotas_de_carros_documentadas_no_openapi(
    client: TestClient, rota: str, metodos: set[str]
) -> None:
    schema = client.get("/openapi.json").json()

    assert set(schema["paths"][rota]) == metodos
    assert "Car" in schema["components"]["schemas"]
