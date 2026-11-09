import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.models.car import CarModel
from app.repositories.car import CarRepository


@pytest.fixture
def dados() -> dict:
    return {"marca": "Fiat", "modelo": "Uno", "ano": 2010, "cor": "Vermelho", "preco": 25000.0}


@pytest.fixture
def repository(db_session: Session) -> CarRepository:
    return CarRepository(db_session)


def test_criar_grava_e_gera_id(
    repository: CarRepository, dados: dict, banco: sessionmaker[Session]
) -> None:
    carro = repository.criar(dados)

    assert carro.id == 1
    with banco() as outra_sessao:
        gravado = outra_sessao.get(CarModel, carro.id)
    assert gravado is not None
    assert gravado.modelo == "Uno"


def test_obter_inexistente_retorna_none(repository: CarRepository) -> None:
    assert repository.obter(42) is None


def test_listar_filtra_marca_e_aplica_limite(repository: CarRepository, dados: dict) -> None:
    for marca, modelo in [("Fiat", "Uno"), ("VW", "Gol"), ("fiat", "Palio"), ("FIAT", "Mobi")]:
        repository.criar({**dados, "marca": marca, "modelo": modelo})

    carros = repository.listar(marca="Fiat", limite=2)

    assert [carro.modelo for carro in carros] == ["Uno", "Palio"]


def test_atualizar_altera_campos_informados(
    repository: CarRepository, dados: dict, banco: sessionmaker[Session]
) -> None:
    carro = repository.criar(dados)

    repository.atualizar(carro, {"cor": "Azul"})

    with banco() as outra_sessao:
        gravado = outra_sessao.get(CarModel, carro.id)
    assert gravado is not None
    assert (gravado.cor, gravado.modelo) == ("Azul", "Uno")


def test_remover_apaga_registro(repository: CarRepository, dados: dict) -> None:
    carro = repository.criar(dados)

    repository.remover(carro)

    assert repository.obter(carro.id) is None
    assert repository.listar() == []
