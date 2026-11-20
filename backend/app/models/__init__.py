# Importa os modelos para registra-los na Base.metadata (usada pelo Alembic).
from app.models.livro import LivroModel

__all__ = ["LivroModel"]
