from fastapi import APIRouter

from app.api.routes import cars, health, operacoes

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(operacoes.router)
api_router.include_router(cars.router)
