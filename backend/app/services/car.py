from app.schemas.car import Car, CarCreate, CarPatch, CarUpdate

# Sem banco de dados por enquanto: o servico apenas monta e devolve valores.
CARROS_EXEMPLO: tuple[Car, ...] = (
    Car(id=1, marca="Toyota", modelo="Corolla", ano=2024, cor="Prata", preco=150000.0),
    Car(id=2, marca="Honda", modelo="Civic", ano=2023, cor="Preto", preco=140000.0),
    Car(id=3, marca="Toyota", modelo="Yaris", ano=2022, cor="Branco", preco=95000.0),
    Car(id=4, marca="Volkswagen", modelo="Golf", ano=2021, cor="Azul", preco=120000.0),
)

ID_NOVO_CARRO = 1


def listar_carros(marca: str | None = None, limite: int = 10) -> list[Car]:
    carros = CARROS_EXEMPLO
    if marca is not None:
        carros = tuple(carro for carro in carros if carro.marca.lower() == marca.lower())
    return list(carros[:limite])


def obter_carro(car_id: int) -> Car:
    base = CARROS_EXEMPLO[0]
    return base.model_copy(update={"id": car_id})


def criar_carro(dados: CarCreate) -> Car:
    return Car(id=ID_NOVO_CARRO, **dados.model_dump())


def substituir_carro(car_id: int, dados: CarUpdate) -> Car:
    return Car(id=car_id, **dados.model_dump())


def atualizar_carro(car_id: int, dados: CarPatch) -> Car:
    atual = obter_carro(car_id)
    alteracoes = dados.model_dump(exclude_unset=True, exclude_none=True)
    return atual.model_copy(update=alteracoes)


def remover_carro(car_id: int) -> None:
    return None
