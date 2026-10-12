import pytest

from app.database.config import DATABASE_URL_PADRAO, get_database_url


def test_database_url_vem_da_variavel_de_ambiente(monkeypatch: pytest.MonkeyPatch) -> None:
    url = "postgresql+psycopg://usuario:senha@db:5432/outro_banco"
    monkeypatch.setenv("DATABASE_URL", url)

    assert get_database_url() == url


def test_database_url_usa_padrao_sem_variavel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert get_database_url() == DATABASE_URL_PADRAO
