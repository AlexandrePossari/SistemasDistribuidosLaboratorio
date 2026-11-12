from collections.abc import Callable
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.livro import LivroModel

CAMPOS_LIVRO = {
    "id",
    "titulo",
    "autor",
    "notas",
    "status",
    "avaliacao",
    "concluido_em",
    "criado_em",
    "atualizado_em",
}
HOJE = date.today().isoformat()


# POST /livros


def test_cadastrar_livro_retorna_201_com_os_campos_do_servidor(
    client: TestClient, livro_payload: dict
) -> None:
    response = client.post("/livros", json=livro_payload)

    assert response.status_code == 201
    livro = response.json()
    assert set(livro) == CAMPOS_LIVRO
    assert livro["id"] == 1
    assert livro["titulo"] == "O Hobbit"
    assert livro["status"] == "quero_ler"
    assert livro["avaliacao"] is None
    assert livro["concluido_em"] is None


def test_cadastrar_livro_persiste_no_banco(
    client: TestClient, livro_payload: dict, db_session: Session
) -> None:
    livro = client.post("/livros", json=livro_payload).json()

    salvo = db_session.get(LivroModel, livro["id"])
    assert salvo is not None
    assert (salvo.titulo, salvo.autor, salvo.notas) == (
        "O Hobbit",
        "J. R. R. Tolkien",
        "Releitura antes do Senhor dos Anéis.",
    )


def test_cadastrar_livro_lido_registra_a_conclusao(client: TestClient) -> None:
    response = client.post(
        "/livros",
        json={"titulo": "Duna", "autor": "Frank Herbert", "status": "lido", "avaliacao": 5},
    )

    assert response.status_code == 201
    assert response.json()["concluido_em"] == HOJE
    assert response.json()["avaliacao"] == 5


def test_cadastrar_com_avaliacao_em_livro_nao_lido_retorna_422(
    client: TestClient, livro_payload: dict
) -> None:
    response = client.post("/livros", json={**livro_payload, "avaliacao": 4})

    assert response.status_code == 422
    assert response.json() == {"detail": "Só é possível avaliar livros lidos"}


def test_cadastrar_titulo_e_autor_repetidos_retorna_409(
    client: TestClient, livro_payload: dict
) -> None:
    client.post("/livros", json=livro_payload)

    response = client.post("/livros", json={"titulo": "  o   HOBBIT ", "autor": "j. r. r. tolkien"})

    assert response.status_code == 409
    assert response.json() == {"detail": 'Já existe um livro "o HOBBIT" de j. r. r. tolkien'}


@pytest.mark.parametrize(
    "alteracao",
    [
        {"titulo": ""},
        {"titulo": "a" * 201},
        {"autor": "   "},
        {"notas": "a" * 5001},
        {"status": "abandonado"},
        {"status": "lido", "avaliacao": 6},
        {"titulo": None},
    ],
)
def test_cadastrar_com_dados_invalidos_retorna_422(
    client: TestClient, livro_payload: dict, alteracao: dict
) -> None:
    response = client.post("/livros", json={**livro_payload, **alteracao})

    assert response.status_code == 422


def test_cadastrar_ignora_campos_controlados_pelo_servidor(
    client: TestClient, livro_payload: dict
) -> None:
    response = client.post(
        "/livros", json={**livro_payload, "id": 500, "concluido_em": "2020-01-01"}
    )

    assert response.status_code == 201
    assert response.json()["id"] == 1
    assert response.json()["concluido_em"] is None


def test_cadastrar_sem_campos_obrigatorios_retorna_422(client: TestClient) -> None:
    response = client.post("/livros", json={})

    assert response.status_code == 422
    assert {erro["loc"][-1] for erro in response.json()["detail"]} == {"titulo", "autor"}


# GET /livros


def test_listar_sem_livros_retorna_lista_vazia(client: TestClient) -> None:
    response = client.get("/livros")

    assert response.status_code == 200
    assert response.json() == []


def test_listar_traz_os_mais_recentes_primeiro(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    for titulo in ("Primeiro", "Segundo", "Terceiro"):
        cadastrar(titulo=titulo)

    titulos = [livro["titulo"] for livro in client.get("/livros").json()]

    assert titulos == ["Terceiro", "Segundo", "Primeiro"]


def test_listar_filtra_por_status(client: TestClient, cadastrar: Callable[..., dict]) -> None:
    cadastrar(titulo="A", status="lendo")
    cadastrar(titulo="B", status="lido")
    cadastrar(titulo="C", status="lendo")

    response = client.get("/livros", params={"status": "lendo"})

    assert response.status_code == 200
    assert sorted(livro["titulo"] for livro in response.json()) == ["A", "C"]


@pytest.mark.parametrize(
    ("busca", "esperado"), [("hobb", ["O Hobbit"]), ("TOLKIEN", ["O Hobbit", "O Silmarillion"])]
)
def test_listar_busca_no_titulo_e_no_autor_sem_diferenciar_maiusculas(
    client: TestClient, cadastrar: Callable[..., dict], busca: str, esperado: list[str]
) -> None:
    cadastrar(titulo="O Hobbit", autor="J. R. R. Tolkien")
    cadastrar(titulo="O Silmarillion", autor="J. R. R. Tolkien")
    cadastrar(titulo="Duna", autor="Frank Herbert")

    response = client.get("/livros", params={"busca": busca})

    assert sorted(livro["titulo"] for livro in response.json()) == esperado


def test_listar_combina_status_e_busca(client: TestClient, cadastrar: Callable[..., dict]) -> None:
    cadastrar(titulo="O Hobbit", autor="Tolkien", status="lido")
    cadastrar(titulo="O Silmarillion", autor="Tolkien", status="quero_ler")

    response = client.get("/livros", params={"status": "lido", "busca": "tolkien"})

    assert [livro["titulo"] for livro in response.json()] == ["O Hobbit"]


def test_listar_respeita_o_limite(client: TestClient, cadastrar: Callable[..., dict]) -> None:
    for numero in range(5):
        cadastrar(titulo=f"Livro {numero}")

    response = client.get("/livros", params={"limite": 2})

    assert len(response.json()) == 2


@pytest.mark.parametrize(
    "params",
    [{"status": "abandonado"}, {"limite": 0}, {"limite": 101}, {"busca": ""}, {"busca": "a" * 101}],
)
def test_listar_recusa_parametros_invalidos(client: TestClient, params: dict) -> None:
    assert client.get("/livros", params=params).status_code == 422


# GET /livros/{id}


def test_obter_livro_retorna_o_livro(client: TestClient, cadastrar: Callable[..., dict]) -> None:
    livro = cadastrar(titulo="Duna")

    response = client.get(f"/livros/{livro['id']}")

    assert response.status_code == 200
    assert response.json() == livro


def test_obter_livro_inexistente_retorna_404(client: TestClient) -> None:
    response = client.get("/livros/99")

    assert response.status_code == 404
    assert response.json() == {"detail": "Livro 99 não encontrado"}


@pytest.mark.parametrize("livro_id", ["0", "-1", "abc"])
def test_obter_livro_com_id_invalido_retorna_422(client: TestClient, livro_id: str) -> None:
    assert client.get(f"/livros/{livro_id}").status_code == 422


# PUT /livros/{id}


def test_substituir_livro_troca_todos_os_campos(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    livro = cadastrar(titulo="Duna", autor="Frank Herbert", notas="nota antiga")

    response = client.put(
        f"/livros/{livro['id']}",
        json={"titulo": "Duna Messias", "autor": "Frank Herbert", "status": "lido", "avaliacao": 4},
    )

    assert response.status_code == 200
    editado = response.json()
    assert editado["titulo"] == "Duna Messias"
    assert editado["notas"] == ""
    assert (editado["status"], editado["avaliacao"], editado["concluido_em"]) == ("lido", 4, HOJE)


def test_substituir_livro_inexistente_retorna_404(client: TestClient, livro_payload: dict) -> None:
    assert client.put("/livros/99", json=livro_payload).status_code == 404


def test_substituir_com_titulo_e_autor_de_outro_livro_retorna_409(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    cadastrar(titulo="Duna", autor="Frank Herbert")
    outro = cadastrar(titulo="Fundação", autor="Isaac Asimov")

    response = client.put(
        f"/livros/{outro['id']}", json={"titulo": "Duna", "autor": "Frank Herbert"}
    )

    assert response.status_code == 409


# PATCH /livros/{id}


def test_fluxo_de_leitura_completo(client: TestClient, cadastrar: Callable[..., dict]) -> None:
    livro = cadastrar(titulo="Duna", autor="Frank Herbert")
    url = f"/livros/{livro['id']}"

    lendo = client.patch(url, json={"status": "lendo"}).json()
    assert (lendo["status"], lendo["concluido_em"]) == ("lendo", None)

    lido = client.patch(url, json={"status": "lido"}).json()
    assert (lido["status"], lido["concluido_em"], lido["avaliacao"]) == ("lido", HOJE, None)

    avaliado = client.patch(url, json={"avaliacao": 5}).json()
    assert (avaliado["avaliacao"], avaliado["concluido_em"]) == (5, HOJE)

    relendo = client.patch(url, json={"status": "lendo"}).json()
    assert (relendo["avaliacao"], relendo["concluido_em"]) == (None, None)


def test_avaliar_livro_nao_lido_retorna_422_e_nada_muda(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    livro = cadastrar(status="lendo")

    response = client.patch(f"/livros/{livro['id']}", json={"avaliacao": 3})

    assert response.status_code == 422
    assert response.json() == {"detail": "Só é possível avaliar livros lidos"}
    assert client.get(f"/livros/{livro['id']}").json()["avaliacao"] is None


def test_patch_altera_so_os_campos_enviados(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    livro = cadastrar(titulo="Duna", autor="Frank Herbert", notas="")

    response = client.patch(f"/livros/{livro['id']}", json={"notas": "Releitura em 2026."})

    assert response.status_code == 200
    assert response.json()["notas"] == "Releitura em 2026."
    assert response.json()["titulo"] == "Duna"


@pytest.mark.parametrize("corpo", [{"titulo": None}, {"status": None}, {"editora": "Aleph"}])
def test_patch_com_dados_invalidos_retorna_422(
    client: TestClient, cadastrar: Callable[..., dict], corpo: dict
) -> None:
    livro = cadastrar()

    assert client.patch(f"/livros/{livro['id']}", json=corpo).status_code == 422


def test_patch_livro_inexistente_retorna_404(client: TestClient) -> None:
    assert client.patch("/livros/99", json={"status": "lido"}).status_code == 404


# DELETE /livros/{id}


def test_remover_livro_retorna_204_e_apaga(
    client: TestClient, cadastrar: Callable[..., dict]
) -> None:
    livro = cadastrar()

    response = client.delete(f"/livros/{livro['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/livros/{livro['id']}").status_code == 404


def test_remover_livro_inexistente_retorna_404(client: TestClient) -> None:
    response = client.delete("/livros/99")

    assert response.status_code == 404
    assert response.json() == {"detail": "Livro 99 não encontrado"}
