# sistemas-distribuidos-2026.2

Repositório para a disciplina de Sistemas Distribuídos - 2026.2

## Estrutura

```
.
├── .github/workflows/ci-backend.yml   # Pipeline de CI do backend
├── backend/
│   ├── app/
│   │   ├── main.py                    # Apenas inicializa a aplicação FastAPI
│   │   ├── api/
│   │   │   ├── router.py              # Agrega os routers
│   │   │   └── routes/                # Endpoints HTTP (cars, operacoes, health)
│   │   ├── schemas/                   # Modelos Pydantic (car)
│   │   └── services/                  # Regras de negócio (car, operacoes)
│   ├── tests/
│   │   ├── unit/                      # Testes de schemas e services, sem HTTP
│   │   └── integration/               # Testes dos endpoints via TestClient
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

## Endpoints de carros

Ainda não há banco de dados: os services apenas montam e devolvem valores.

| Método | Rota             | Parâmetros                         | Resposta |
|--------|------------------|------------------------------------|----------|
| GET    | `/cars`          | query `marca`, `limite` (1–100)    | 200 lista de `Car` |
| GET    | `/cars/{car_id}` | path `car_id` (> 0)                | 200 `Car` |
| POST   | `/cars`          | corpo `CarCreate`                  | 201 `Car` |
| PUT    | `/cars/{car_id}` | path `car_id` + corpo `CarUpdate`  | 200 `Car` |
| PATCH  | `/cars/{car_id}` | path `car_id` + corpo `CarPatch`   | 200 `Car` |
| DELETE | `/cars/{car_id}` | path `car_id`                      | 204 sem corpo |

A documentação interativa fica em `http://localhost:8000/docs`.

## Testes

Os testes ficam em [backend/tests/](backend/tests/), separados em duas suítes:

- **`tests/unit/`**: testam schemas Pydantic e services diretamente, sem camada HTTP;
- **`tests/integration/`**: testam todos os endpoints via `TestClient` do FastAPI.

Cada teste recebe automaticamente o marker `unit` ou `integration` conforme a pasta, e
o Pytest recusa testes fora dessas duas pastas. A configuração do Pytest (`testpaths`, `pythonpath`) está
declarada em `[tool.pytest.ini_options]` no [backend/pyproject.toml](backend/pyproject.toml).

### Pelo Makefile (recomendado)

```bash
make test              # roda toda a suíte
make test-v            # saída verbosa, um teste por linha
make test-k K=404      # roda apenas os testes cujo nome casa com a expressão
make test-unit         # roda apenas os testes unitários
make test-integration  # roda apenas os testes de integração
```

### Direto pelo Poetry

```bash
cd backend
poetry run pytest
poetry run pytest -v
poetry run pytest tests/unit
poetry run pytest -m integration
poetry run pytest tests/integration/test_cars_api.py::test_criar_carro_retorna_201
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
6. execução dos testes unitários (`poetry run pytest -v tests/unit`);
7. execução dos testes de integração (`poetry run pytest -v tests/integration`).


