# Minha Biblioteca

Projeto Final da disciplina C216 — Sistemas Distribuídos (2026.2).

## Objetivo e tema

A **Minha Biblioteca** é uma aplicação web para acompanhar leituras pessoais: registrar
os livros que você quer ler, está lendo ou já leu, guardar suas notas sobre cada um e
avaliar os livros concluídos.

A aplicação é composta por uma API em FastAPI, um banco PostgreSQL e um frontend em React,
executados juntos com Docker Compose.

> Nesta etapa está pronto o backend: a API de livros com as regras de leitura, o banco
> PostgreSQL com migrations, os testes e o CI. O frontend vem nas próximas etapas.

## Funcionalidades

- Cadastrar livros com título, autor e notas.
- Acompanhar o status de leitura: **Quero ler**, **Lendo** ou **Lido**.
- Avaliar de 1 a 5 os livros lidos.
- Listar os livros do mais recente para o mais antigo, filtrando pelo status e buscando
  por um trecho do título ou do autor.
- Editar todos os dados de um livro ou só o status, a avaliação ou as notas.
- Excluir livros.

### Regras de negócio

| Regra | O que acontece |
|-------|----------------|
| O status pode mudar livremente | Qualquer transição entre Quero ler, Lendo e Lido é aceita |
| Livro marcado como Lido | Recebe a data de conclusão (`concluido_em`) com o dia de hoje |
| Livro que continua Lido | Mantém a data de conclusão original, mesmo se for editado |
| Livro que deixa de ser Lido | Perde a avaliação e a data de conclusão |
| Avaliar livro que não está Lido | Recusado com **422** "Só é possível avaliar livros lidos" |
| Título + autor repetidos | Recusado com **409**, sem diferenciar maiúsculas e espaços |

Título e autor têm os espaços das pontas removidos e espaços repetidos unidos
(`"  O   Hobbit "` vira `"O Hobbit"`). As regras ficam no service e também são garantidas
pelo banco, com CHECK constraints e um índice único em `lower(titulo), lower(autor)`.

## Tecnologias

| Parte | Ferramentas |
|-------|-------------|
| Backend | Python 3.12, FastAPI, Uvicorn, Pydantic |
| Banco de dados | PostgreSQL 16, SQLAlchemy, Alembic (migrations), psycopg |
| Dependências | Poetry |
| Qualidade | Ruff (lint e formatação) |
| Testes | Pytest + TestClient |
| Infraestrutura | Docker, Docker Compose, Makefile |
| CI | GitHub Actions |

## Estrutura

```
.
├── .github/workflows/
│   └── ci-backend.yml           # CI do backend: lint e testes
├── backend/
│   ├── app/
│   │   ├── main.py              # Cria a aplicação FastAPI, routers e tratadores de erro
│   │   ├── api/
│   │   │   ├── router.py        # Agrega os routers
│   │   │   ├── erros.py         # Erros de domínio -> respostas HTTP (404, 409, 422)
│   │   │   └── routes/          # Endpoints HTTP (health, livros)
│   │   ├── schemas/             # Schemas Pydantic (entrada e saída da API)
│   │   ├── services/            # Regras de negócio
│   │   ├── repositories/        # Acesso ao banco com SQLAlchemy
│   │   ├── models/              # Modelos ORM (tabela livros)
│   │   └── database/            # URL do banco, engine, sessão e Base declarativa
│   ├── alembic/
│   │   ├── env.py               # Usa a DATABASE_URL e os modelos da aplicação
│   │   └── versions/            # Migrations
│   ├── tests/
│   │   ├── unit/                # Schemas e service (repository em memória), sem banco
│   │   └── integration/         # Endpoints, repository e migrations no PostgreSQL
│   ├── alembic.ini
│   ├── pyproject.toml           # Dependências e configuração do Pytest e do Ruff
│   ├── poetry.lock
│   └── Dockerfile
├── docker-compose.yml           # PostgreSQL + API
├── .env.example                 # Variáveis de ambiente de exemplo
└── Makefile                     # Comandos de execução, testes e manutenção
```

### Camadas do backend

```
rota (api/routes)  →  service (services)  →  repository (repositories)  →  PostgreSQL
  schemas Pydantic      regras de negócio       modelos ORM (models)
```

- As **rotas** recebem e devolvem schemas Pydantic e só chamam o service.
- O **service** aplica as regras de status, avaliação e duplicidade e lança erros de
  domínio, que `api/erros.py` converte em 404, 409 ou 422.
- O **repository** é a única camada que conhece o SQLAlchemy.

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

A API só inicia depois que o PostgreSQL passa no healthcheck. Ao subir, o container da API
executa `alembic upgrade head` antes do Uvicorn, então o banco sempre está com todas as
migrations aplicadas. O próprio container da API tem um healthcheck que consulta o
`/health`. Os dados ficam no volume e continuam lá depois de reiniciar ou recriar os
containers. O Compose usa o nome de projeto
`minha-biblioteca`, então containers, rede e o volume `biblioteca_dados` são próprios
deste projeto.

### API fora do Docker

```bash
make up         # garante o PostgreSQL rodando
make install    # instala as dependências com Poetry
make migrate    # aplica as migrations no banco de DATABASE_URL
make dev        # API com reload em http://localhost:8000
```

## Migrations (Alembic)

```bash
make migrate                         # alembic upgrade head
make migration M="adiciona editora"  # gera uma migration a partir dos modelos (autogenerate)
make downgrade                       # desfaz a última migration
make db-current                      # mostra a migration atual do banco
make db-history                      # lista o histórico de migrations
```

A URL do banco não fica no `alembic.ini`: o `alembic/env.py` usa a mesma `DATABASE_URL`
da aplicação. As migrations geradas passam automaticamente pelo Ruff. A migration
`0001` cria a tabela `livros`, as CHECK constraints das regras e o índice único de
título + autor.

## Acessando a API

A documentação interativa (Swagger) fica em http://localhost:8000/docs.

| Método | Rota | Uso | Respostas |
|--------|------|-----|-----------|
| GET | `/` | Nome da API e caminho da documentação | 200 |
| GET | `/health` | API no ar e conexão com o banco | 200 · 503 |
| GET | `/livros` | Lista, com os filtros abaixo | 200 · 422 |
| GET | `/livros/{id}` | Um livro | 200 · 404 |
| POST | `/livros` | Cadastra | 201 · 409 · 422 |
| PUT | `/livros/{id}` | Edita todos os campos | 200 · 404 · 409 · 422 |
| PATCH | `/livros/{id}` | Altera só os campos enviados (ex.: status ou avaliação) | 200 · 404 · 409 · 422 |
| DELETE | `/livros/{id}` | Exclui | 204 · 404 |

Parâmetros do `GET /livros`:

| Parâmetro | Valores | Padrão |
|-----------|---------|--------|
| `status` | `quero_ler`, `lendo` ou `lido` | todos |
| `busca` | trecho do título ou do autor (1 a 100 caracteres, sem diferenciar maiúsculas) | — |
| `limite` | 1 a 100 | 50 |

Campos de um livro:

| Campo | Regras |
|-------|--------|
| `titulo` | obrigatório, 1 a 200 caracteres |
| `autor` | obrigatório, 1 a 120 caracteres |
| `notas` | opcional, até 5000 caracteres (padrão `""`) |
| `status` | `quero_ler` (padrão), `lendo` ou `lido` |
| `avaliacao` | opcional, inteiro de 1 a 5, só para livros lidos. No PATCH, `null` remove a avaliação |
| `id`, `concluido_em`, `criado_em`, `atualizado_em` | definidos pelo servidor (somente leitura) |

Exemplo:

```bash
curl -X POST http://localhost:8000/livros \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Duna", "autor": "Frank Herbert", "status": "lido", "avaliacao": 5}'
```

Os erros seguem o formato do FastAPI: `{"detail": "Livro 7 não encontrado"}`. Nos erros de
validação (422), `detail` traz a lista de campos inválidos.

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

- **`tests/unit/`**: schemas (validação e normalização), configuração e **todas as regras
  de negócio** do service, usando um repository em memória e uma data de "hoje" fixa, sem
  HTTP e sem banco;
- **`tests/integration/`**: no PostgreSQL real, cobrem
  - os 6 endpoints de livros via `TestClient`, incluindo filtros, busca, ordem e as
    respostas 404, 409 e 422;
  - o repository, inclusive as CHECK constraints e o índice único recusando dados
    inválidos direto no banco;
  - as migrations: upgrade, downgrade e um teste que falha se um modelo mudar sem
    migration nova.

Os testes de integração usam o banco separado `biblioteca_test`. Ele é criado
automaticamente, recebe as migrations reais e tem a tabela `livros` esvaziada antes de
cada teste.

Cada teste recebe o marker `unit` ou `integration` de acordo com a pasta, e testes fora
dessas pastas são recusados.

```bash
make up                 # os testes de integração precisam do PostgreSQL
make test               # todos os testes
make test-unit          # só os unitários (não precisam de banco)
make test-integration   # só os de integração
```

## CI (GitHub Actions)

O workflow [.github/workflows/ci-backend.yml](.github/workflows/ci-backend.yml) roda em
**push** e **pull request** para qualquer branch, sempre que algo em `backend/` ou o
próprio workflow mudar.

**Lint e formatação (Ruff):** valida o `poetry.lock`, instala as dependências e roda
`ruff check .` e `ruff format --check .`.

**Testes**, que só rodam se o lint passar (`needs: lint`), com um PostgreSQL 16 como
*service container*:

1. testes unitários (`pytest tests/unit`);
2. migrations (`alembic upgrade head`);
3. conferência de que modelos e migrations estão sincronizados (`alembic check`);
4. testes de integração (`pytest tests/integration`).

Rode `make help` para ver todos os comandos.
