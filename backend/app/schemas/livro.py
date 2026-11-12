from datetime import date, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator


class StatusLeitura(StrEnum):
    QUERO_LER = "quero_ler"
    LENDO = "lendo"
    LIDO = "lido"


def _normalizar_espacos(valor: object) -> object:
    """Remove espacos nas pontas e junta espacos repetidos ("  O   Hobbit " -> "O Hobbit")."""
    if isinstance(valor, str):
        return " ".join(valor.split())
    return valor


def _remover_espacos_nas_pontas(valor: object) -> object:
    return valor.strip() if isinstance(valor, str) else valor


Titulo = Annotated[
    str,
    BeforeValidator(_normalizar_espacos),
    Field(min_length=1, max_length=200, examples=["O Hobbit"]),
]
Autor = Annotated[
    str,
    BeforeValidator(_normalizar_espacos),
    Field(min_length=1, max_length=120, examples=["J. R. R. Tolkien"]),
]
# Nas notas as quebras de linha importam: so as pontas sao limpas.
Notas = Annotated[
    str,
    BeforeValidator(_remover_espacos_nas_pontas),
    Field(max_length=5000, examples=["Releitura antes do Senhor dos Anéis."]),
]
Avaliacao = Annotated[int, Field(ge=1, le=5, examples=[5])]


class LivroBase(BaseModel):
    titulo: Titulo
    autor: Autor
    notas: Notas = ""
    status: StatusLeitura = StatusLeitura.QUERO_LER
    avaliacao: Avaliacao | None = None


class LivroCreate(LivroBase):
    """Dados para cadastrar um livro (POST)."""


class LivroUpdate(LivroBase):
    """Edicao completa de um livro (PUT): campos omitidos voltam ao valor padrao."""


class LivroPatch(BaseModel):
    """Alteracao parcial (PATCH): so os campos enviados mudam.

    Enviar "avaliacao": null remove a avaliacao de um livro lido.
    """

    model_config = ConfigDict(extra="forbid")

    titulo: Titulo | None = None
    autor: Autor | None = None
    notas: Notas | None = None
    status: StatusLeitura | None = None
    avaliacao: Avaliacao | None = None

    @model_validator(mode="after")
    def _so_avaliacao_aceita_null(self) -> "LivroPatch":
        nulos = [
            campo
            for campo in ("titulo", "autor", "notas", "status")
            if campo in self.model_fields_set and getattr(self, campo) is None
        ]
        if nulos:
            raise ValueError(f"Campos que não aceitam null: {', '.join(nulos)}")
        return self


class Livro(LivroBase):
    """Livro como devolvido pela API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    concluido_em: date | None
    criado_em: datetime
    atualizado_em: datetime
