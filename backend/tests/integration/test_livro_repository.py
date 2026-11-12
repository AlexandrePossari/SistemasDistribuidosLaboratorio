from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories.livro import LivroRepository, TituloAutorDuplicadoError


@pytest.fixture
def repositorio(db_session: Session) -> LivroRepository:
    return LivroRepository(db_session)


def _dados(**campos) -> dict:
    return {"titulo": "Duna", "autor": "Frank Herbert", **campos}


def test_criar_preenche_padroes_do_banco(repositorio: LivroRepository) -> None:
    livro = repositorio.criar(_dados())

    assert livro.id == 1
    assert (livro.notas, livro.status) == ("", "quero_ler")
    assert livro.criado_em is not None
    assert livro.atualizado_em is not None


def test_atualizar_muda_o_atualizado_em(repositorio: LivroRepository) -> None:
    livro = repositorio.criar(_dados())
    antes = livro.atualizado_em

    atualizado = repositorio.atualizar(livro, {"notas": "nova nota"})

    assert atualizado.atualizado_em > antes
    assert atualizado.criado_em == livro.criado_em


def test_busca_trata_porcentagem_e_sublinhado_como_texto(repositorio: LivroRepository) -> None:
    repositorio.criar(_dados(titulo="100% Tolkien"))
    repositorio.criar(_dados(titulo="1000 Tolkien"))
    repositorio.criar(_dados(titulo="guia_rapido"))
    repositorio.criar(_dados(titulo="guia rapido"))

    assert [livro.titulo for livro in repositorio.listar(busca="100%")] == ["100% Tolkien"]
    assert [livro.titulo for livro in repositorio.listar(busca="a_r")] == ["guia_rapido"]


def test_existe_titulo_autor_ignora_maiusculas_e_o_proprio_livro(
    repositorio: LivroRepository,
) -> None:
    livro = repositorio.criar(_dados())

    assert repositorio.existe_titulo_autor("DUNA", "frank herbert") is True
    assert repositorio.existe_titulo_autor("Duna", "Frank Herbert", ignorar_id=livro.id) is False
    assert repositorio.existe_titulo_autor("Duna", "Outro") is False


def test_indice_unico_do_banco_recusa_titulo_e_autor_repetidos(
    repositorio: LivroRepository,
) -> None:
    repositorio.criar(_dados())

    # Sem passar pelo service: quem barra e o indice uq_livros_titulo_autor.
    with pytest.raises(TituloAutorDuplicadoError):
        repositorio.criar(_dados(titulo="DUNA", autor="FRANK HERBERT"))

    assert len(repositorio.listar()) == 1


@pytest.mark.parametrize(
    "dados",
    [
        _dados(status="lendo", avaliacao=3),  # avaliacao so em livro lido
        _dados(status="lido", avaliacao=4),  # livro lido sem data de conclusao
        _dados(status="quero_ler", concluido_em=date(2026, 1, 1)),  # conclusao sem estar lido
        _dados(status="lido", concluido_em=date(2026, 1, 1), avaliacao=9),  # fora de 1 a 5
        _dados(status="abandonado"),  # status desconhecido
    ],
)
def test_constraints_do_banco_garantem_as_regras(
    repositorio: LivroRepository, db_session: Session, dados: dict
) -> None:
    with pytest.raises(IntegrityError):
        repositorio.criar(dados)
    db_session.rollback()
