import pytest

from app.schemas.car import Car, CarCreate, CarPatch, CarUpdate
from app.services import car as car_service


@pytest.fixture
def dados() -> dict:
    return {"marca": "Fiat", "modelo": "Uno", "ano": 2010, "cor": "Vermelho", "preco": 25000.0}


def test_listar_carros_sem_filtro_retorna_todos() -> None:
    assert car_service.listar_carros() == list(car_service.CARROS_EXEMPLO)


def test_listar_carros_filtra_marca_sem_diferenciar_maiusculas() -> None:
    carros = car_service.listar_carros(marca="honda")

    assert [carro.modelo for carro in carros] == ["Civic"]


@pytest.mark.parametrize("limite", [1, 2, 3])
def test_listar_carros_aplica_limite(limite: int) -> None:
    assert len(car_service.listar_carros(limite=limite)) == limite


def test_obter_carro_retorna_carro_com_id_informado() -> None:
    carro = car_service.obter_carro(42)

    assert isinstance(carro, Car)
    assert carro.id == 42


def test_criar_carro_atribui_id(dados: dict) -> None:
    carro = car_service.criar_carro(CarCreate(**dados))

    assert carro == Car(id=car_service.ID_NOVO_CARRO, **dados)


def test_substituir_carro_usa_todos_os_dados(dados: dict) -> None:
    carro = car_service.substituir_carro(8, CarUpdate(**dados))

    assert carro == Car(id=8, **dados)


def test_atualizar_carro_altera_apenas_campos_enviados() -> None:
    original = car_service.obter_carro(2)

    carro = car_service.atualizar_carro(2, CarPatch(cor="Amarelo"))

    assert carro == original.model_copy(update={"cor": "Amarelo"})


def test_atualizar_carro_ignora_campos_nulos() -> None:
    original = car_service.obter_carro(2)

    assert car_service.atualizar_carro(2, CarPatch(cor=None)) == original


def test_remover_carro_nao_retorna_nada() -> None:
    assert car_service.remover_carro(1) is None
