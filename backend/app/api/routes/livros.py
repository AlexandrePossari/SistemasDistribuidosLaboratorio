from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.livro import LivroRepository
from app.schemas.livro import (
    Livro,
    LivroCreate,
    LivroPatch,
    LivroUpdate,
    ResumoLeitura,
    StatusLeitura,
)
from app.services.livro import LivroService


def get_livro_service(db: Annotated[Session, Depends(get_db)]) -> LivroService:
    return LivroService(LivroRepository(db))


Service = Annotated[LivroService, Depends(get_livro_service)]
LivroId = Annotated[int, Path(gt=0, description="Identificador do livro")]

ERRO_404 = {status.HTTP_404_NOT_FOUND: {"description": "Livro não encontrado"}}
ERRO_409 = {status.HTTP_409_CONFLICT: {"description": "Já existe um livro com este título e autor"}}

router = APIRouter(prefix="/livros", tags=["livros"])


@router.get("", response_model=list[Livro])
def listar_livros(
    service: Service,
    status_leitura: Annotated[
        StatusLeitura | None, Query(alias="status", description="Filtra pelo status de leitura")
    ] = None,
    busca: Annotated[
        str | None,
        Query(min_length=1, max_length=100, description="Trecho do título ou do autor"),
    ] = None,
    limite: Annotated[int, Query(ge=1, le=100, description="Quantidade máxima")] = 50,
) -> list[Livro]:
    """Lista os livros, do mais recente para o mais antigo."""
    return service.listar_livros(status=status_leitura, busca=busca, limite=limite)


# Declarada antes de /{livro_id}, senao "resumo" seria lido como um id.
@router.get("/resumo", response_model=ResumoLeitura)
def resumo_de_leitura(service: Service) -> ResumoLeitura:
    """Quantidade de livros em cada status, para o resumo da tela inicial."""
    return service.resumo()


@router.get("/{livro_id}", response_model=Livro, responses=ERRO_404)
def obter_livro(livro_id: LivroId, service: Service) -> Livro:
    return service.obter_livro(livro_id)


@router.post("", response_model=Livro, status_code=status.HTTP_201_CREATED, responses=ERRO_409)
def criar_livro(dados: LivroCreate, service: Service) -> Livro:
    return service.criar_livro(dados)


@router.put("/{livro_id}", response_model=Livro, responses={**ERRO_404, **ERRO_409})
def substituir_livro(livro_id: LivroId, dados: LivroUpdate, service: Service) -> Livro:
    """Edita todos os campos do livro."""
    return service.substituir_livro(livro_id, dados)


@router.patch("/{livro_id}", response_model=Livro, responses={**ERRO_404, **ERRO_409})
def atualizar_livro(livro_id: LivroId, dados: LivroPatch, service: Service) -> Livro:
    """Altera só os campos enviados (ex.: mudar o status ou avaliar)."""
    return service.atualizar_livro(livro_id, dados)


@router.delete("/{livro_id}", status_code=status.HTTP_204_NO_CONTENT, responses=ERRO_404)
def remover_livro(livro_id: LivroId, service: Service) -> None:
    service.remover_livro(livro_id)
