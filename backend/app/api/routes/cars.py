from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.car import CarRepository
from app.schemas.car import Car, CarCreate, CarPatch, CarUpdate
from app.services.car import CarroNaoEncontradoError, CarService


def get_car_service(db: Annotated[Session, Depends(get_db)]) -> CarService:
    return CarService(CarRepository(db))


def _nao_encontrado(erro: CarroNaoEncontradoError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(erro))


router = APIRouter(
    prefix="/cars",
    tags=["cars"],
    responses={status.HTTP_404_NOT_FOUND: {"description": "Carro nao encontrado"}},
)

CarId = Annotated[int, Path(gt=0, description="Identificador do carro")]
Service = Annotated[CarService, Depends(get_car_service)]


@router.get("", response_model=list[Car])
def listar_carros(
    service: Service,
    marca: Annotated[str | None, Query(min_length=1, description="Filtra pela marca")] = None,
    limite: Annotated[int, Query(ge=1, le=100, description="Quantidade maxima")] = 10,
) -> list[Car]:
    return service.listar_carros(marca=marca, limite=limite)


@router.get("/{car_id}", response_model=Car)
def obter_carro(car_id: CarId, service: Service) -> Car:
    try:
        return service.obter_carro(car_id)
    except CarroNaoEncontradoError as erro:
        raise _nao_encontrado(erro) from erro


@router.post("", response_model=Car, status_code=status.HTTP_201_CREATED)
def criar_carro(dados: CarCreate, service: Service) -> Car:
    return service.criar_carro(dados)


@router.put("/{car_id}", response_model=Car)
def substituir_carro(car_id: CarId, dados: CarUpdate, service: Service) -> Car:
    try:
        return service.substituir_carro(car_id, dados)
    except CarroNaoEncontradoError as erro:
        raise _nao_encontrado(erro) from erro


@router.patch("/{car_id}", response_model=Car)
def atualizar_carro(car_id: CarId, dados: CarPatch, service: Service) -> Car:
    try:
        return service.atualizar_carro(car_id, dados)
    except CarroNaoEncontradoError as erro:
        raise _nao_encontrado(erro) from erro


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_carro(car_id: CarId, service: Service) -> None:
    try:
        service.remover_carro(car_id)
    except CarroNaoEncontradoError as erro:
        raise _nao_encontrado(erro) from erro
