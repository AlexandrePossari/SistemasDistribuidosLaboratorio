import pytest

from app.api.cors import CORS_ORIGINS_PADRAO, get_cors_origins


def test_cors_origins_usa_padrao_sem_variavel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert get_cors_origins() == list(CORS_ORIGINS_PADRAO)


def test_cors_origins_usa_padrao_com_variavel_vazia(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " , ")

    assert get_cors_origins() == list(CORS_ORIGINS_PADRAO)


def test_cors_origins_separa_por_virgula_e_normaliza(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " http://localhost:3000/ ,https://app.exemplo.com")

    assert get_cors_origins() == ["http://localhost:3000", "https://app.exemplo.com"]


def test_cors_origins_recusa_curinga(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173,*")

    with pytest.raises(ValueError, match="nao aceita"):
        get_cors_origins()
