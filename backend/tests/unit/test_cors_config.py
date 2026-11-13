import pytest

from app.api.cors import CORS_ORIGINS_PADRAO, get_cors_origins


def test_usa_as_origens_padrao_sem_variavel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert get_cors_origins() == list(CORS_ORIGINS_PADRAO)


def test_usa_as_origens_padrao_com_variavel_vazia(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " , ")

    assert get_cors_origins() == list(CORS_ORIGINS_PADRAO)


def test_separa_por_virgula_e_remove_barra_final(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", " http://localhost:3000/ ,https://biblioteca.exemplo.com")

    assert get_cors_origins() == ["http://localhost:3000", "https://biblioteca.exemplo.com"]


def test_recusa_o_curinga(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173,*")

    with pytest.raises(ValueError, match="não aceita"):
        get_cors_origins()
