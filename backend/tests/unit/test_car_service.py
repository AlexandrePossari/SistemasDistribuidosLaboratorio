from typing import Any

import pytest

from app.models.car import CarModel
from app.schemas.car import Car, CarCreate, CarPatch, CarUpdate
from app.services.car import CarroNaoEncontradoError, CarService


class FakeCarRepository:
    def __init__(self) -> None:
        self.carros: dict[int, CarModel] = {}
        self.proximo_id = 1

    def listar(self, marca: str | None = None, limite: int = 10) -> list[CarModel]:
        carros = sorted(self.carros.values(), key=lambda carro: carro.id)
        if marca is not None:
            carros = [carro for carro in carros if carro.marca.lower() == marca.lower()]
        return carros[:limite]

    def obter(self, car_id: int) -> CarModel | None:
        return self.carros.get(car_id)

    def criar(self, dados: dict[str, Any]) -> CarModel:
        carro = CarModel(id=self.proximo_id, **dados)
        self.carros[carro.id] = carro
        self.proximo_id += 1
        return carro

    def atualizar(self, carro: CarModel, dados: dict[str, Any]) -> CarModel:
        for campo, valor in dados.items():
            setattr(carro, campo, valor)
        return carro

    def remover(self, carro: CarModel) -> None:
        del self.carros[carro.id]


CARROS = (
    {"marca": "Toyota", "modelo": "Corolla", "ano": 2024, "cor": "Prata", "preco": 150000.0},
    {"marca": "Honda", "modelo": "Civic", "ano": 2023, "cor": "Preto", "preco": 140000.0},
    {"marca": "Toyota", "modelo": "Yaris", "ano": 2022, "cor": "Branco", "preco": 95000.0},
)


@pytest.fixture
def dados() -> dict:
    return {"marca": "Fiat", "modelo": "Uno", "ano": 2010, "cor": "Vermelho", "preco": 25000.0}


@pytest.fixture
def repository() -> FakeCarRepository:
    repo = FakeCarRepository()
    for carro in CARROS:
        repo.criar(carro)
    return repo


@pytest.fixture
def service(repository: FakeCarRepository) -> CarService:
    return CarService(repository)


def test_listar_carros_sem_filtro_retorna_todos(service: CarService) -> None:
    carros = service.listar_carros()

    assert carros == [Car(id=i, **dados) for i, dados in enumerate(CARROS, start=1)]


def test_listar_carros_filtra_marca_sem_diferenciar_maiusculas(service: CarService) -> None:
    carros = service.listar_carros(marca="toyota")

    assert [carro.modelo for carro in carros] == ["Corolla", "Yaris"]


@pytest.mark.parametrize("limite", [1, 2, 3])
def test_listar_carros_aplica_limite(service: CarService, limite: int) -> None:
    assert len(service.listar_carros(limite=limite)) == limite


def test_obter_carro_retorna_schema_pydantic(service: CarService) -> None:
    carro = service.obter_carro(2)

    assert isinstance(carro, Car)
    assert carro == Car(id=2, **CARROS[1])


def test_obter_carro_inexistente_levanta_erro(service: CarService) -> None:
    with pytest.raises(CarroNaoEncontradoError, match="Carro 42 nao encontrado"):
        service.obter_carro(42)


def test_criar_carro_grava_no_repository(
    service: CarService, repository: FakeCarRepository, dados: dict
) -> None:
    carro = service.criar_carro(CarCreate(**dados))

    assert carro == Car(id=4, **dados)
    assert repository.obter(4) is not None


def test_substituir_carro_usa_todos_os_dados(service: CarService, dados: dict) -> None:
    carro = service.substituir_carro(1, CarUpdate(**dados))

    assert carro == Car(id=1, **dados)
    assert service.obter_carro(1) == carro


def test_substituir_carro_inexistente_levanta_erro(service: CarService, dados: dict) -> None:
    with pytest.raises(CarroNaoEncontradoError):
        service.substituir_carro(42, CarUpdate(**dados))


def test_atualizar_carro_altera_apenas_campos_enviados(service: CarService) -> None:
    original = service.obter_carro(2)

    carro = service.atualizar_carro(2, CarPatch(cor="Amarelo"))

    assert carro == original.model_copy(update={"cor": "Amarelo"})


def test_atualizar_carro_ignora_campos_nulos(service: CarService) -> None:
    original = service.obter_carro(2)

    assert service.atualizar_carro(2, CarPatch(cor=None)) == original


def test_atualizar_carro_inexistente_levanta_erro(service: CarService) -> None:
    with pytest.raises(CarroNaoEncontradoError):
        service.atualizar_carro(42, CarPatch(cor="Azul"))


def test_remover_carro_apaga_do_repository(
    service: CarService, repository: FakeCarRepository
) -> None:
    assert service.remover_carro(1) is None
    assert repository.obter(1) is None


def test_remover_carro_inexistente_levanta_erro(service: CarService) -> None:
    with pytest.raises(CarroNaoEncontradoError):
        service.remover_carro(42)
