from decimal import Decimal

from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class CarModel(Base):
    __tablename__ = "cars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    marca: Mapped[str] = mapped_column(String(50), index=True)
    modelo: Mapped[str] = mapped_column(String(50))
    ano: Mapped[int] = mapped_column(Integer)
    cor: Mapped[str] = mapped_column(String(30))
    preco: Mapped[Decimal] = mapped_column(Numeric(12, 2))
