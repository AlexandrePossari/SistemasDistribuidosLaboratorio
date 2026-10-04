class DivisaoPorZeroError(ValueError):
    pass


def somar(a: float, b: float) -> float:
    return a + b


def dividir(a: float, b: float) -> float:
    if b == 0:
        raise DivisaoPorZeroError("Divisao por zero nao e permitida")
    return a / b
