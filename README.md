# sistemas-distribuidos-2026.2

Repositório para a disciplina de Sistemas Distribuídos - 2026.2

## Estrutura

```
.
├── .github/workflows/ci-backend.yml   # Pipeline de CI do backend
├── backend/
│   ├── src/main.py                    # Aplicação FastAPI
│   ├── tests/                         # Suíte de testes (Pytest)
│   ├── pyproject.toml                 # Dependências e configuração do Pytest
│   └── Dockerfile
├── docker-compose.yml                 # Backend + PostgreSQL
└── Makefile                           # Atalhos de desenvolvimento
```

## Pré-requisitos

- Python 3.12
- [Poetry](https://python-poetry.org/docs/#installation) 2.x
- Docker e Docker Compose (opcional, para subir o ambiente completo)

## Instalação

```bash
make install
```

O comando executa `poetry install` dentro de `backend/`, instalando as dependências
de produção e o grupo `dev` (onde ficam o Pytest e o cliente HTTP de teste).

## Executando a aplicação

```bash
make dev    # servidor FastAPI com reload em http://localhost:8000
make up     # sobe backend e banco via Docker Compose
```

Rode `make help` para ver todos os alvos disponíveis.

## Testes

Os testes ficam em [backend/tests/](backend/tests/) e usam **Pytest** com o
`TestClient` do FastAPI. A configuração do Pytest (`testpaths`, `pythonpath`) está
declarada em `[tool.pytest.ini_options]` no [backend/pyproject.toml](backend/pyproject.toml).

### Pelo Makefile (recomendado)

```bash
make test              # roda toda a suíte
make test-v            # saída verbosa, um teste por linha
make test-k K=404      # roda apenas os testes cujo nome casa com a expressão
```

### Direto pelo Poetry

```bash
cd backend
poetry run pytest
poetry run pytest -v
poetry run pytest tests/test_main.py::test_root_endpoint_returns_200
```


## CI (GitHub Actions)

O workflow [.github/workflows/ci-backend.yml](.github/workflows/ci-backend.yml) roda
automaticamente em **push** e em **pull request** para qualquer branch, sempre que algo
em `backend/` ou o próprio workflow mudar. As etapas são:

1. checkout do repositório;
2. instalação do Poetry via `pipx`;
3. configuração do Python 3.12 com cache das dependências do Poetry;
4. validação do `poetry.lock` (`poetry check --lock`);
5. instalação das dependências (`poetry install --no-root --with dev`);
6. execução dos testes (`poetry run pytest -v`).


