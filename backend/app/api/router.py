from fastapi import APIRouter

from app.api.routes import health, livros

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(livros.router)
