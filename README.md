# sistemas-distribuidos-2026.2

Repositório para a disciplina de Sistemas Distribuídos - 2026.2

## Estrutura

```
.
├── .github/workflows/ci-backend.yml   # Pipeline de CI do backend (lint + testes)
├── backend/
│   ├── app/
│   │   ├── main.py                    # Apenas inicializa a aplicação FastAPI
│   │   ├── api/
│   │   │   ├── router.py              # Agrega os routers
│   │   │   └── routes/                # Endpoints HTTP (cars, operacoes, health)
│   │   ├── schemas/                   # Schemas Pydantic (entrada/saída da API)
│   │   ├── services/                  # Regras de negócio (usam os repositories)
│   │   ├── repositories/              # Acesso aos dados via SQLAlchemy
│   │   ├── models/                    # Modelos ORM do SQLAlchemy
│   │   └── database/                  # Configuração, engine, sessão e Base declarativa
│   ├── alembic/
│   │   ├── env.py                     # Lê DATABASE_URL e os modelos ORM
│   │   └── versions/                  # Migrations do banco
│   ├── tests/
│   │   ├── unit/                      # Schemas, services e config, sem HTTP nem banco
│   │   └── integration/               # Endpoints, repository e migrations no PostgreSQL
│   ├── alembic.ini                    # Configuração do Alembic
│   ├── pyproject.toml                 # Dependências e configuração do Pytest e do Ruff
│   └── Dockerfile
├── docker-compose.yml                 # Backend + PostgreSQL
└── Makefile                           # Atalhos de desenvolvimento
```

### Camadas

```
rota (api/routes)  →  service (services)  →  repository (repositories)  →  PostgreSQL
     schemas Pydantic         regras de negócio        modelos ORM (models)
```

- As **rotas** recebem e devolvem **schemas Pydantic** e obtêm o service via `Depends`.
- O **service** aplica as regras (ex.: carro inexistente → `CarroNaoEncontradoError`, que
  a rota traduz para `404`) e converte os modelos ORM em schemas (`Car.model_validate`).
- O **repository** é a única camada que conhece o SQLAlchemy.
- Os **modelos ORM** (`app/models`) ficam separados dos **schemas Pydantic** (`app/schemas`).

## Pré-requisitos

- Python 3.12
- [Poetry](https://python-poetry.org/docs/#installation) 2.x
- Docker e Docker Compose

## Configuração

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

| Variável            | Uso |
|---------------------|-----|
| `POSTGRES_*`        | Usuário, senha, banco e porta do container do PostgreSQL |
| `DATABASE_URL`      | Conexão da aplicação e do Alembic (ex.: `postgresql+psycopg://postgres:postgres@localhost:5432/sistemas_distribuidos`) |
| `TEST_DATABASE_URL` | Banco usado pelos testes de integração (padrão: `sistemas_distribuidos_test`) |

Dentro do Docker Compose, o backend recebe `DATABASE_URL` apontando para o host `db`.

## Instalação

```bash
make install
```

O comando executa `poetry install` dentro de `backend/`, instalando as dependências
de produção e o grupo `dev` (Pytest, cliente HTTP de teste e Ruff).

## Executando a aplicação

### Com Docker Compose (recomendado)

```bash
make up-build   # constrói a imagem e sobe PostgreSQL + API em http://localhost:8000
make logs       # acompanha os logs
make down       # derruba os containers (os dados continuam no volume postgres_data)
```

Ao subir, o container do backend executa `alembic upgrade head` antes do Uvicorn,
então o banco sempre está com todas as migrations aplicadas. Os dados ficam no volume
`postgres_data` e permanecem após reiniciar a API ou recriar os containers.

### Localmente

```bash
make up         # garante o PostgreSQL rodando (porta 5432)
make migrate    # aplica as migrations no banco de DATABASE_URL
make dev        # servidor FastAPI com reload em http://localhost:8000
```

Rode `make help` para ver todos os alvos disponíveis.

## Migrations (Alembic)

```bash
make migrate                       # alembic upgrade head
make migration M="adiciona placa"  # gera migration a partir dos modelos ORM (autogenerate)
make downgrade                     # desfaz a última migration
make db-current                    # mostra a revisão atual do banco
```

A URL do banco não fica no `alembic.ini`: o `alembic/env.py` usa a mesma `DATABASE_URL`
da aplicação. As migrations geradas passam automaticamente pelo Ruff.

## Endpoints de carros

Os dados são persistidos na tabela `cars` do PostgreSQL.

| Método | Rota             | Parâmetros                         | Resposta |
|--------|------------------|------------------------------------|----------|
| GET    | `/cars`          | query `marca`, `limite` (1–100)    | 200 lista de `Car` |
| GET    | `/cars/{car_id}` | path `car_id` (> 0)                | 200 `Car` · 404 |
| POST   | `/cars`          | corpo `CarCreate`                  | 201 `Car` |
| PUT    | `/cars/{car_id}` | path `car_id` + corpo `CarUpdate`  | 200 `Car` · 404 |
| PATCH  | `/cars/{car_id}` | path `car_id` + corpo `CarPatch`   | 200 `Car` · 404 |
| DELETE | `/cars/{car_id}` | path `car_id`                      | 204 sem corpo · 404 |

A documentação interativa fica em `http://localhost:8000/docs`.

## Qualidade de código

```bash
make format   # ruff check --fix + ruff format
make lint     # ruff check + ruff format --check (não altera arquivos)
```

A configuração do Ruff fica em `[tool.ruff]` no [backend/pyproject.toml](backend/pyproject.toml).

## Testes

Os testes ficam em [backend/tests/](backend/tests/), separados em duas suítes:

- **`tests/unit/`**: testam schemas, services (com um repository falso em memória) e a
  leitura da configuração, sem HTTP e sem banco;
- **`tests/integration/`**: testam os endpoints via `TestClient`, o repository e as
  migrations contra um **PostgreSQL real**.

Os testes de integração usam um banco separado (`TEST_DATABASE_URL`, por padrão
`sistemas_distribuidos_test`), que é criado automaticamente, recebe as migrations via
Alembic e tem a tabela `cars` limpa antes de cada teste. Por isso, **o PostgreSQL
precisa estar rodando** (`make up`) antes de `make test`.

Cada teste recebe automaticamente o marker `unit` ou `integration` conforme a pasta, e
o Pytest recusa testes fora dessas duas pastas.

### Pelo Makefile (recomendado)

```bash
make up                # sobe o PostgreSQL
make test              # roda toda a suíte
make test-v            # saída verbosa, um teste por linha
make test-k K=404      # roda apenas os testes cujo nome casa com a expressão
make test-unit         # roda apenas os testes unitários (não precisa de banco)
make test-integration  # roda apenas os testes de integração
```

### Direto pelo Poetry

```bash
cd backend
poetry run pytest
poetry run pytest tests/unit
poetry run pytest -m integration
poetry run pytest tests/integration/test_cars_api.py::test_criar_carro_retorna_201_com_id_gerado
```

## Checklist antes do PR

```bash
make format
make lint
make test
make up-build
```

## CI (GitHub Actions)

O workflow [.github/workflows/ci-backend.yml](.github/workflows/ci-backend.yml) roda
automaticamente em **push** e em **pull request** para qualquer branch, sempre que algo
em `backend/` ou o próprio workflow mudar. Ele tem dois jobs:

**Lint (Ruff)**

1. instala Poetry, Python 3.12 e as dependências;
2. `ruff check .` e `ruff format --check .`.

**Testes**, com um PostgreSQL 16 como *service container*:

1. checkout do repositório;
2. instalação do Poetry via `pipx`;
3. configuração do Python 3.12 com cache das dependências do Poetry;
4. validação do `poetry.lock` (`poetry check --lock`);
5. instalação das dependências (`poetry install --no-root --with dev`);
6. execução dos testes unitários (`poetry run pytest -v tests/unit`);
7. aplicação das migrations (`poetry run alembic upgrade head`);
8. execução dos testes de integração (`poetry run pytest -v tests/integration`).
