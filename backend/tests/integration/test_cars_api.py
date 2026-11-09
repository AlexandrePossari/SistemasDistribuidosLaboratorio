from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.models.car import CarModel

CAMPOS_CARRO = {"id", "marca", "modelo", "ano", "cor", "preco"}

CARROS = (
    {"marca": "Toyota", "modelo": "Corolla", "ano": 2024, "cor": "Prata", "preco": 150000.0},
    {"marca": "Honda", "modelo": "Civic", "ano": 2023, "cor": "Preto", "preco": 140000.0},
    {"marca": "Toyota", "modelo": "Yaris", "ano": 2022, "cor": "Branco", "preco": 95000.0},
)

pytestmark = pytest.mark.usefixtures("banco")


@pytest.fixture
def cadastrar(client: TestClient) -> Callable[[dict], dict]:
    def _cadastrar(dados: dict) -> dict:
        response = client.post("/cars", json=dados)
        assert response.status_code == 201
        return response.json()

    return _cadastrar


@pytest.fixture
def carros(cadastrar: Callable[[dict], dict]) -> list[dict]:
    return [cadastrar(dados) for dados in CARROS]


# GET /cars


def test_listar_carros_sem_cadastro_retorna_lista_vazia(client: TestClient) -> None:
    response = client.get("/cars")

    assert response.status_code == 200
    assert response.json() == []


def test_listar_carros_retorna_cadastrados_em_ordem_de_id(
    client: TestClient, carros: list[dict]
) -> None:
    response = client.get("/cars")

    assert response.status_code == 200
    assert response.json() == carros
    assert all(set(carro) == CAMPOS_CARRO for carro in response.json())


@pytest.mark.parametrize("marca", ["Toyota", "toyota", "TOYOTA"])
def test_listar_carros_filtra_por_marca_via_query(
    client: TestClient, carros: list[dict], marca: str
) -> None:
    response = client.get("/cars", params={"marca": marca})

    assert response.status_code == 200
    assert [carro["modelo"] for carro in response.json()] == ["Corolla", "Yaris"]


def test_listar_carros_marca_inexistente_retorna_lista_vazia(
    client: TestClient, carros: list[dict]
) -> None:
    response = client.get("/cars", params={"marca": "Ferrari"})

    assert response.status_code == 200
    assert response.json() == []


def test_listar_carros_respeita_limite_via_query(client: TestClient, carros: list[dict]) -> None:
    response = client.get("/cars", params={"limite": 2})

    assert response.status_code == 200
    assert response.json() == carros[:2]


@pytest.mark.parametrize(
    "params", [{"limite": 0}, {"limite": 101}, {"limite": "abc"}, {"marca": ""}]
)
def test_listar_carros_rejeita_query_invalida(client: TestClient, params: dict) -> None:
    response = client.get("/cars", params=params)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][0] == "query"


# GET /cars/{car_id}


def test_obter_carro_retorna_carro_cadastrado(client: TestClient, carros: list[dict]) -> None:
    alvo = carros[1]

    response = client.get(f"/cars/{alvo['id']}")

    assert response.status_code == 200
    assert response.json() == alvo


def test_obter_carro_inexistente_retorna_404(client: TestClient) -> None:
    response = client.get("/cars/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Carro 999 nao encontrado"}


@pytest.mark.parametrize("car_id", ["0", "-1", "abc"])
def test_obter_carro_rejeita_id_invalido(client: TestClient, car_id: str) -> None:
    response = client.get(f"/cars/{car_id}")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# POST /cars


def test_criar_carro_retorna_201_com_id_gerado(client: TestClient, carro_payload: dict) -> None:
    response = client.post("/cars", json=carro_payload)

    assert response.status_code == 201
    assert response.json() == {"id": 1, **carro_payload}


def test_criar_carro_gera_ids_sequenciais(cadastrar: Callable[[dict], dict]) -> None:
    ids = [cadastrar(dados)["id"] for dados in CARROS]

    assert ids == [1, 2, 3]


def test_criar_carro_persiste_no_banco(
    client: TestClient, carro_payload: dict, db_session: Session
) -> None:
    carro_payload["preco"] = 99999.99

    criado = client.post("/cars", json=carro_payload).json()

    registro = db_session.get(CarModel, criado["id"])
    assert registro is not None
    assert (registro.marca, registro.modelo, registro.ano, registro.cor) == (
        "Fiat",
        "Uno",
        2010,
        "Vermelho",
    )
    assert float(registro.preco) == 99999.99


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
    assert client.get("/cars").json() == []


# PUT /cars/{car_id}


def test_substituir_carro_troca_todos_os_campos(
    client: TestClient, carros: list[dict], carro_payload: dict
) -> None:
    alvo_id = carros[0]["id"]

    response = client.put(f"/cars/{alvo_id}", json=carro_payload)

    assert response.status_code == 200
    assert response.json() == {"id": alvo_id, **carro_payload}
    assert client.get(f"/cars/{alvo_id}").json() == {"id": alvo_id, **carro_payload}


def test_substituir_carro_inexistente_retorna_404(client: TestClient, carro_payload: dict) -> None:
    response = client.put("/cars/999", json=carro_payload)

    assert response.status_code == 404
    assert client.get("/cars").json() == []


def test_substituir_carro_exige_corpo_completo(client: TestClient, carros: list[dict]) -> None:
    response = client.put(f"/cars/{carros[0]['id']}", json={"cor": "Verde"})

    assert response.status_code == 422


def test_substituir_carro_rejeita_id_invalido(client: TestClient, carro_payload: dict) -> None:
    response = client.put("/cars/0", json=carro_payload)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# PATCH /cars/{car_id}


def test_atualizar_carro_altera_apenas_campos_enviados(
    client: TestClient, carros: list[dict]
) -> None:
    original = carros[2]

    response = client.patch(f"/cars/{original['id']}", json={"cor": "Verde", "preco": 99999.0})

    esperado = {**original, "cor": "Verde", "preco": 99999.0}
    assert response.status_code == 200
    assert response.json() == esperado
    assert client.get(f"/cars/{original['id']}").json() == esperado


def test_atualizar_carro_com_corpo_vazio_nao_altera_nada(
    client: TestClient, carros: list[dict]
) -> None:
    original = carros[2]

    response = client.patch(f"/cars/{original['id']}", json={})

    assert response.status_code == 200
    assert response.json() == original


def test_atualizar_carro_inexistente_retorna_404(client: TestClient) -> None:
    response = client.patch("/cars/999", json={"cor": "Verde"})

    assert response.status_code == 404


@pytest.mark.parametrize(
    "corpo", [{"ano": 1500}, {"preco": 0}, {"marca": ""}, {"campo_inexistente": 1}]
)
def test_atualizar_carro_valida_campos(client: TestClient, carros: list[dict], corpo: dict) -> None:
    response = client.patch(f"/cars/{carros[0]['id']}", json=corpo)

    assert response.status_code == 422
    assert client.get(f"/cars/{carros[0]['id']}").json() == carros[0]


def test_atualizar_carro_rejeita_id_invalido(client: TestClient) -> None:
    response = client.patch("/cars/-1", json={"cor": "Verde"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["path", "car_id"]


# DELETE /cars/{car_id}


def test_remover_carro_retorna_204_e_apaga_do_banco(
    client: TestClient, carros: list[dict], banco: sessionmaker[Session]
) -> None:
    alvo_id = carros[0]["id"]

    response = client.delete(f"/cars/{alvo_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/cars/{alvo_id}").status_code == 404
    with banco() as session:
        assert session.get(CarModel, alvo_id) is None
    assert client.get("/cars").json() == carros[1:]


def test_remover_carro_inexistente_retorna_404(client: TestClient) -> None:
    response = client.delete("/cars/999")

    assert response.status_code == 404


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
