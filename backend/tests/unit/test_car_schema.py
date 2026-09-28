import pytest
from pydantic import ValidationError

from app.schemas.car import ANO_MAXIMO, ANO_MINIMO, Car, CarCreate, CarPatch


@pytest.fixture
def dados_validos() -> dict:
    return {"marca": "Fiat", "modelo": "Uno", "ano": 2010, "cor": "Vermelho", "preco": 25000.0}


def test_car_create_aceita_dados_validos(dados_validos: dict) -> None:
    carro = CarCreate(**dados_validos)

    assert carro.model_dump() == dados_validos


@pytest.mark.parametrize("ano", [ANO_MINIMO, ANO_MAXIMO])
def test_car_create_aceita_limites_de_ano(dados_validos: dict, ano: int) -> None:
    assert CarCreate(**{**dados_validos, "ano": ano}).ano == ano


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("ano", ANO_MINIMO - 1),
        ("ano", ANO_MAXIMO + 1),
        ("preco", 0),
        ("preco", -1),
        ("marca", ""),
        ("modelo", "x" * 51),
        ("cor", ""),
    ],
)
def test_car_create_rejeita_valores_invalidos(dados_validos: dict, campo: str, valor: object) -> None:
    with pytest.raises(ValidationError) as excinfo:
        CarCreate(**{**dados_validos, campo: valor})

    assert excinfo.value.errors()[0]["loc"] == (campo,)


def test_car_exige_id_positivo(dados_validos: dict) -> None:
    with pytest.raises(ValidationError):
        Car(id=0, **dados_validos)


def test_car_patch_permite_corpo_vazio() -> None:
    assert CarPatch().model_dump(exclude_unset=True) == {}


def test_car_patch_valida_campos_enviados() -> None:
    with pytest.raises(ValidationError):
        CarPatch(preco=-5)


def test_car_patch_rejeita_campos_desconhecidos() -> None:
    with pytest.raises(ValidationError):
        CarPatch(placa="ABC1234")
