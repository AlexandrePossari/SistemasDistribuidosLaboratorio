from typing import Literal

from pydantic import BaseModel


class Health(BaseModel):
    """Estado da API e da conexao com o banco de dados."""

    status: Literal["ok", "erro"]
    banco: Literal["ok", "indisponivel"]
