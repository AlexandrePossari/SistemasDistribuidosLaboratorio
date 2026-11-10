# Minha Biblioteca

Projeto Final da disciplina C216 — Sistemas Distribuídos (2026.2).

## Objetivo e tema

A **Minha Biblioteca** é uma aplicação web para acompanhar leituras pessoais: registrar
os livros que você quer ler, está lendo ou já leu, guardar suas notas sobre cada um e
avaliar os livros concluídos.

A aplicação é composta por uma API em FastAPI, um banco PostgreSQL e um frontend em React,
executados juntos com Docker Compose.

> Nesta etapa estão prontos a base do backend (API com verificação de saúde e conexão com
> o banco) e a infraestrutura com Docker Compose.

## Tecnologias

| Parte | Ferramentas |
|-------|-------------|
| Backend | Python 3.12, FastAPI, Uvicorn, SQLAlchemy, psycopg |
| Banco de dados | PostgreSQL 16 |
| Dependências | Poetry |
| Qualidade | Ruff (lint e formatação) |
| Testes | Pytest + TestClient |
| Infraestrutura | Docker, Docker Compose, Makefile |

## Estrutura

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # Cria a aplicação FastAPI e registra os routers
│   │   ├── api/
│   │   │   ├── router.py        # Agrega os routers
│   │   │   └── routes/          # Endpoints HTTP (health)
│   │   ├── schemas/             # Schemas Pydantic das respostas
│   │   └── database/            # URL do banco, engine e sessão por requisição
│   ├── tests/
│   │   ├── unit/                # Sem HTTP e sem banco
│   │   └── integration/         # TestClient + PostgreSQL real
│   ├── pyproject.toml           # Dependências e configuração do Pytest e do Ruff
│   ├── poetry.lock
│   └── Dockerfile
├── docker-compose.yml           # PostgreSQL + API
├── .env.example                 # Variáveis de ambiente de exemplo
└── Makefile                     # Comandos de execução, testes e manutenção
```

## Pré-requisitos

- Docker e Docker Compose
- Make
- Para rodar o backend e os testes fora do Docker: Python 3.12 e
  [Poetry](https://python-poetry.org/docs/#installation) 2.x

## Variáveis de ambiente

Copie o arquivo de exemplo antes da primeira execução:

```bash
cp .env.example .env
```

| Variável | Padrão | Uso |
|----------|--------|-----|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `postgres` / `postgres` | Usuário e senha do PostgreSQL |
| `POSTGRES_DB` | `biblioteca` | Banco da aplicação |
| `POSTGRES_PORT` | `5432` | Porta do PostgreSQL publicada na máquina |
| `BACKEND_PORT` | `8000` | Porta da API publicada na máquina |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/biblioteca` | Conexão da API quando ela roda fora do Docker |
| `TEST_DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/biblioteca_test` | Banco dos testes de integração |

Dentro do Docker Compose, a API recebe `DATABASE_URL` apontando para o serviço `db`.
Se alguma porta já estiver em uso por outro projeto, troque `POSTGRES_PORT` ou
`BACKEND_PORT` no `.env` (e ajuste a porta nas URLs de conexão).

O `.env` não é versionado; o `.env.example` contém apenas valores de desenvolvimento.

## Executando

### Com Docker Compose (recomendado)

```bash
make up-build   # constrói a imagem da API e sobe PostgreSQL + API
make ps         # status dos containers
make logs       # acompanha os logs
make down       # derruba os containers (os dados continuam no volume)
```

| Serviço | Container | Endereço |
|---------|-----------|----------|
| `db` | `biblioteca-db` | PostgreSQL em `localhost:5432` |
| `api` | `biblioteca-api` | API em http://localhost:8000 |

A API só inicia depois que o PostgreSQL passa no healthcheck, e o próprio container da
API tem um healthcheck que consulta o `/health`. O Compose usa o nome de projeto
`minha-biblioteca`, então containers, rede e o volume `biblioteca_dados` são próprios
deste projeto.

### API fora do Docker

```bash
make up         # garante o PostgreSQL rodando
make install    # instala as dependências com Poetry
make dev        # API com reload em http://localhost:8000
```

## Acessando a API

| Método | Rota | Resposta |
|--------|------|----------|
| GET | `/` | Nome da API e caminho da documentação |
| GET | `/health` | `200 {"status": "ok", "banco": "ok"}` ou `503 {"status": "erro", "banco": "indisponivel"}` |

A documentação interativa (Swagger) fica em http://localhost:8000/docs.

```bash
make health     # curl em /health
```

## Qualidade de código

```bash
make format     # ruff check --fix + ruff format
make lint       # ruff check + ruff format --check (não altera arquivos)
```

A configuração do Ruff fica em `[tool.ruff]` no [backend/pyproject.toml](backend/pyproject.toml).

## Testes

Os testes ficam em [backend/tests/](backend/tests/), em duas suítes:

- **`tests/unit/`**: configuração do banco e schemas, sem HTTP e sem banco;
- **`tests/integration/`**: endpoints via `TestClient` contra um PostgreSQL real, no banco
  separado `biblioteca_test` (criado automaticamente na primeira execução).

Cada teste recebe o marker `unit` ou `integration` de acordo com a pasta, e testes fora
dessas pastas são recusados.

```bash
make up                 # os testes de integração precisam do PostgreSQL
make test               # todos os testes
make test-unit          # só os unitários (não precisam de banco)
make test-integration   # só os de integração
```

Rode `make help` para ver todos os comandos.
