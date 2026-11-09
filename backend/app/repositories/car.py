from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.car import CarModel


class CarRepository:
    """Acesso aos dados de carros no banco: unica camada que conhece o SQLAlchemy."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def listar(self, marca: str | None = None, limite: int = 10) -> list[CarModel]:
        consulta = select(CarModel).order_by(CarModel.id).limit(limite)
        if marca is not None:
            consulta = consulta.where(func.lower(CarModel.marca) == marca.lower())
        return list(self.session.scalars(consulta))

    def obter(self, car_id: int) -> CarModel | None:
        return self.session.get(CarModel, car_id)

    def criar(self, dados: dict[str, Any]) -> CarModel:
        carro = CarModel(**dados)
        self.session.add(carro)
        self.session.commit()
        self.session.refresh(carro)
        return carro

    def atualizar(self, carro: CarModel, dados: dict[str, Any]) -> CarModel:
        for campo, valor in dados.items():
            setattr(carro, campo, valor)
        self.session.commit()
        self.session.refresh(carro)
        return carro

    def remover(self, carro: CarModel) -> None:
        self.session.delete(carro)
        self.session.commit()
