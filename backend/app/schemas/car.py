from pydantic import BaseModel, ConfigDict, Field

ANO_MINIMO = 1886
ANO_MAXIMO = 2100


class CarBase(BaseModel):
    marca: str = Field(min_length=1, max_length=50, examples=["Toyota"])
    modelo: str = Field(min_length=1, max_length=50, examples=["Corolla"])
    ano: int = Field(ge=ANO_MINIMO, le=ANO_MAXIMO, examples=[2024])
    cor: str = Field(min_length=1, max_length=30, examples=["Prata"])
    preco: float = Field(gt=0, examples=[150000.0])


class CarCreate(CarBase):
    """Dados para cadastrar um carro (POST)."""


class CarUpdate(CarBase):
    """Substituicao completa de um carro (PUT): todos os campos sao obrigatorios."""


class CarPatch(BaseModel):
    """Atualizacao parcial de um carro (PATCH): apenas os campos enviados mudam."""

    model_config = ConfigDict(extra="forbid")

    marca: str | None = Field(default=None, min_length=1, max_length=50)
    modelo: str | None = Field(default=None, min_length=1, max_length=50)
    ano: int | None = Field(default=None, ge=ANO_MINIMO, le=ANO_MAXIMO)
    cor: str | None = Field(default=None, min_length=1, max_length=30)
    preco: float | None = Field(default=None, gt=0)


class Car(CarBase):
    id: int = Field(gt=0, examples=[1])
