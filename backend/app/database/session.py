from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database.config import get_database_url

# pool_pre_ping descarta conexoes mortas (ex.: o banco reiniciou) antes de usa-las;
# connect_timeout evita que uma requisicao fique presa se o banco estiver fora do ar.
engine = create_engine(
    get_database_url(),
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Dependencia do FastAPI: uma sessao por requisicao, fechada ao final."""
    with SessionLocal() as session:
        yield session
