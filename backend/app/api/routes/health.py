from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.health import Health

router = APIRouter(tags=["health"])


@router.get("/")
def raiz() -> dict[str, str]:
    return {"nome": "Minha Biblioteca API", "docs": "/docs"}


@router.get(
    "/health",
    response_model=Health,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": Health}},
)
def health(response: Response, db: Annotated[Session, Depends(get_db)]) -> Health:
    """Confere se a API esta no ar e se consegue falar com o PostgreSQL."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return Health(status="erro", banco="indisponivel")
    return Health(status="ok", banco="ok")
