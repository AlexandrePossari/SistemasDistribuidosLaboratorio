from app.models.car import CarModel
from app.repositories.car import CarRepository
from app.schemas.car import Car, CarCreate, CarPatch, CarUpdate


class CarroNaoEncontradoError(LookupError):
    def __init__(self, car_id: int) -> None:
        super().__init__(f"Carro {car_id} nao encontrado")
        self.car_id = car_id


class CarService:
    def __init__(self, repository: CarRepository) -> None:
        self.repository = repository

    def listar_carros(self, marca: str | None = None, limite: int = 10) -> list[Car]:
        carros = self.repository.listar(marca=marca, limite=limite)
        return [Car.model_validate(carro) for carro in carros]

    def obter_carro(self, car_id: int) -> Car:
        return Car.model_validate(self._buscar(car_id))

    def criar_carro(self, dados: CarCreate) -> Car:
        return Car.model_validate(self.repository.criar(dados.model_dump()))

    def substituir_carro(self, car_id: int, dados: CarUpdate) -> Car:
        carro = self.repository.atualizar(self._buscar(car_id), dados.model_dump())
        return Car.model_validate(carro)

    def atualizar_carro(self, car_id: int, dados: CarPatch) -> Car:
        alteracoes = dados.model_dump(exclude_unset=True, exclude_none=True)
        carro = self.repository.atualizar(self._buscar(car_id), alteracoes)
        return Car.model_validate(carro)

    def remover_carro(self, car_id: int) -> None:
        self.repository.remover(self._buscar(car_id))

    def _buscar(self, car_id: int) -> CarModel:
        carro = self.repository.obter(car_id)
        if carro is None:
            raise CarroNaoEncontradoError(car_id)
        return carro
