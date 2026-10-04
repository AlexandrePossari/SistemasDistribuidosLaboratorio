import pytest

from app.services.operacoes import DivisaoPorZeroError, dividir, somar


@pytest.mark.parametrize(("a", "b", "esperado"), [(2, 3, 5), (-1, 1, 0), (0.1, 0.2, 0.3)])
def test_somar(a: float, b: float, esperado: float) -> None:
    assert somar(a, b) == pytest.approx(esperado)


@pytest.mark.parametrize(("a", "b", "esperado"), [(9, 3, 3.0), (7, 2, 3.5), (0, 5, 0.0)])
def test_dividir(a: float, b: float, esperado: float) -> None:
    assert dividir(a, b) == pytest.approx(esperado)


def test_dividir_por_zero_levanta_erro_de_dominio() -> None:
    with pytest.raises(DivisaoPorZeroError, match="Divisao por zero nao e permitida"):
        dividir(1, 0)
