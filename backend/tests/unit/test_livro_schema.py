import pytest
from pydantic import ValidationError

from app.schemas.livro import LivroCreate, LivroPatch, StatusLeitura


def _livro(**dados) -> LivroCreate:
    return LivroCreate(**{"titulo": "O Hobbit", "autor": "J. R. R. Tolkien", **dados})


def test_usa_os_valores_padrao() -> None:
    livro = _livro()

    assert livro.notas == ""
    assert livro.status is StatusLeitura.QUERO_LER
    assert livro.avaliacao is None


def test_normaliza_espacos_de_titulo_e_autor() -> None:
    livro = _livro(titulo="  O   Hobbit ", autor=" J. R. R.\tTolkien ")

    assert livro.titulo == "O Hobbit"
    assert livro.autor == "J. R. R. Tolkien"


def test_notas_mantem_quebras_de_linha_e_limpam_as_pontas() -> None:
    livro = _livro(notas="  capítulo 1: ótimo\n\ncapítulo 2: lento  ")

    assert livro.notas == "capítulo 1: ótimo\n\ncapítulo 2: lento"


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("titulo", ""),
        ("titulo", "   "),
        ("titulo", "a" * 201),
        ("autor", ""),
        ("autor", "a" * 121),
        ("notas", "a" * 5001),
        ("status", "abandonado"),
        ("avaliacao", 0),
        ("avaliacao", 6),
    ],
)
def test_recusa_valores_invalidos(campo: str, valor: object) -> None:
    with pytest.raises(ValidationError):
        _livro(**{campo: valor})


def test_aceita_os_limites() -> None:
    livro = _livro(titulo="a" * 200, autor="b" * 120, notas="c" * 5000, status="lido", avaliacao=5)

    assert len(livro.titulo) == 200
    assert livro.avaliacao == 5


def test_titulo_e_autor_sao_obrigatorios() -> None:
    with pytest.raises(ValidationError) as erro:
        LivroCreate()

    assert {e["loc"][0] for e in erro.value.errors()} == {"titulo", "autor"}


def test_patch_guarda_so_os_campos_enviados() -> None:
    patch = LivroPatch(status="lido", avaliacao=None)

    assert patch.model_dump(exclude_unset=True) == {"status": StatusLeitura.LIDO, "avaliacao": None}


@pytest.mark.parametrize("campo", ["titulo", "autor", "notas", "status"])
def test_patch_recusa_null_em_campo_obrigatorio(campo: str) -> None:
    with pytest.raises(ValidationError, match="não aceitam null"):
        LivroPatch(**{campo: None})


def test_patch_recusa_campo_desconhecido() -> None:
    with pytest.raises(ValidationError):
        LivroPatch(editora="Martins Fontes")
