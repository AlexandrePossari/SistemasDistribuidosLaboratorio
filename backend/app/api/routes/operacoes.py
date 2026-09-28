from fastapi import APIRouter, HTTPException, status

from app.services import operacoes as operacoes_service

router = APIRouter(tags=["operacoes"])


@router.get("/soma")
def soma(a: float, b: float):
    return {"resultado": operacoes_service.somar(a, b)}


@router.get("/divisao")
def divisao(a: float, b: float):
    try:
        resultado = operacoes_service.dividir(a, b)
    except operacoes_service.DivisaoPorZeroError as erro:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(erro)) from erro
    return {"resultado": resultado}
