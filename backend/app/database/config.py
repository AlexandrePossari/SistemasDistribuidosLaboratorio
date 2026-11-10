import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL_PADRAO = "postgresql+psycopg://postgres:postgres@localhost:5432/biblioteca"


def get_database_url() -> str:
    """URL de conexao com o PostgreSQL, lida da variavel de ambiente DATABASE_URL."""
    return os.getenv("DATABASE_URL", DATABASE_URL_PADRAO)
