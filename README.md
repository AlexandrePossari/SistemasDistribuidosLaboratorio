# Minha Biblioteca

Projeto Final da disciplina C216 — Sistemas Distribuídos (2026.2).

## Objetivo e tema

A **Minha Biblioteca** é uma aplicação web para acompanhar leituras pessoais: registrar
os livros que você quer ler, está lendo ou já leu, guardar suas notas sobre cada um e
avaliar os livros concluídos.

A aplicação é composta por uma API em FastAPI, um banco PostgreSQL e um frontend em React,
executados juntos com Docker Compose.

> Nesta etapa estão prontos o backend (API, banco com migrations, testes e CI) e o
> frontend em React consumindo a API. O frontend ainda roda fora do Docker (`make
> front-dev`); o container dele e os testes E2E vêm na próxima etapa.

## Funcionalidades

- Cadastrar livros com título, autor e notas.
- Acompanhar o status de leitura: **Quero ler**, **Lendo** ou **Lido**.
- Avaliar de 1 a 5 os livros lidos.
- Listar os livros do mais recente para o mais antigo, filtrando pelo status e buscando
  por um trecho do título ou do autor.
- Editar todos os dados de um livro ou só o status, a avaliação ou as notas.
- Excluir livros.
- Ver um resumo com a quantidade de livros em cada status.

Na interface, tudo fica numa página só:

- **cabeçalho** com o resumo (Quero ler · Lendo · Lido);
- **formulário** para adicionar e editar. O campo de avaliação só aparece quando o status
  é Lido;
- **abas de status** (Todos, Quero ler, Lendo, Lido) e **busca** por título ou autor;
- **cartões** dos livros com ações rápidas:
  - seletor de status;
  - estrelas para avaliar os livros lidos (clicar na nota atual remove a avaliação);
  - notas longas recolhidas com "ver mais";
  - Editar e Excluir, com confirmação na própria tela;
- estados de **carregamento**, **lista vazia**, **erro ao carregar** (com "Tentar
  novamente") e **avisos** de sucesso ou erro em cada ação.

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
| Frontend | React 19 (JavaScript), Vite, Tailwind CSS v4 |
| Testes | Pytest + TestClient (backend), Vitest + Testing Library + jsdom (frontend) |
| Qualidade do frontend | Biome (lint e formatação) |
| Infraestrutura | Docker, Docker Compose, Makefile |
| CI | GitHub Actions |

## Estrutura

```
.
├── .github/workflows/
│   ├── ci-backend.yml           # CI do backend: lint e testes
│   └── ci-frontend.yml          # CI do frontend: lint, testes e build
├── backend/
│   ├── app/
│   │   ├── main.py              # Cria a aplicação FastAPI, routers e tratadores de erro
│   │   ├── api/
│   │   │   ├── router.py        # Agrega os routers
│   │   │   ├── cors.py          # CORS com as origens de CORS_ORIGINS
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
├── frontend/
│   ├── src/
│   │   ├── main.jsx             # Monta o React no #root
│   │   ├── pages/               # BibliotecaPage: estado da tela e chamadas à API
│   │   ├── components/          # Formulário, filtros, cartão, estrelas, resumo, avisos
│   │   ├── services/            # api.js (cliente HTTP) e livros.js (endpoints /livros)
│   │   └── utils/               # Validação do formulário e formatação (funções puras)
│   ├── tests/
│   │   ├── unit/                # Funções, serviços (fetch mockado) e componentes isolados
│   │   └── integration/         # A página inteira com o serviço de livros mockado
│   ├── package.json             # Dependências e scripts npm
│   ├── vite.config.js           # Vite, plugins React/Tailwind e configuração do Vitest
│   └── biome.json               # Regras de lint e formatação
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
- Node.js 22.12+ e npm (frontend)
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
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origens que o navegador pode usar para chamar a API, separadas por vírgula. `*` é recusado |

O frontend tem o seu próprio exemplo, `frontend/.env.example`, com `VITE_API_URL`
(padrão `http://localhost:8000`): a URL da API como o **navegador** a enxerga.

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

### Frontend

```bash
make up                                  # a API e o banco precisam estar no ar
cp frontend/.env.example frontend/.env   # VITE_API_URL=http://localhost:8000
make front-install                       # npm ci
make front-dev                           # Vite em http://localhost:5173
```

Para gerar e servir o build de produção: `make front-build` e `make front-preview`.

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

A interface fica em http://localhost:5173 (com `make front-dev`) e a documentação
interativa da API (Swagger) em http://localhost:8000/docs.

| Método | Rota | Uso | Respostas |
|--------|------|-----|-----------|
| GET | `/` | Nome da API e caminho da documentação | 200 |
| GET | `/health` | API no ar e conexão com o banco | 200 · 503 |
| GET | `/livros` | Lista, com os filtros abaixo | 200 · 422 |
| GET | `/livros/resumo` | Quantidade de livros em cada status e o total | 200 |
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

### CORS

O frontend (porta 5173) e a API (porta 8000) são origens diferentes, então o navegador só
deixa o frontend ler as respostas se a API autorizar essa origem. O `CORSMiddleware`
([backend/app/api/cors.py](backend/app/api/cors.py)) é configurado com:

- **origens explícitas**, lidas de `CORS_ORIGINS`. O curinga `*` é recusado quando a API
  sobe;
- só os métodos usados pelo frontend (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) e o header
  `Content-Type`;
- sem credenciais.

### Como o frontend chama a API

```
BibliotecaPage / componentes  →  services/livros.js  →  services/api.js (fetch)  →  API
```

`services/livros.js` tem uma função para cada endpoint. A função `request`, em
`services/api.js`, trata os três cenários de uma requisição:

1. **API inacessível** (o `fetch` falha): mensagem "Não foi possível conectar à API.
   Verifique se o backend está rodando.";
2. **resposta de erro** (404, 409, 422...): a mensagem do `detail` da API. Os erros de
   validação viram `campo: mensagem`;
3. **sucesso**: o JSON da resposta (ou nada, no 204 do DELETE).

O formulário repete as validações do backend (campos obrigatórios, tamanhos, avaliação só
em livro lido) para não enviar dados que a API recusaria, mas a validação que vale é a da
API. Depois de cada alteração, a lista e o resumo são buscados de novo, para a tela
mostrar exatamente o que está no banco.

```bash
make health     # curl em /health
```

## Qualidade de código

```bash
make format         # backend: ruff check --fix + ruff format
make lint           # backend: ruff check + ruff format --check (não altera arquivos)
make front-format   # frontend: biome check --write (formata, organiza imports, corrige)
make front-lint     # frontend: biome check (não altera arquivos)
```

A configuração do Ruff fica em `[tool.ruff]` no [backend/pyproject.toml](backend/pyproject.toml)
e a do Biome em [frontend/biome.json](frontend/biome.json).

## Testes

### Backend (Pytest)

Os testes ficam em [backend/tests/](backend/tests/), em duas suítes:

- **`tests/unit/`**: schemas (validação e normalização), configuração e **todas as regras
  de negócio** do service, usando um repository em memória e uma data de "hoje" fixa, sem
  HTTP e sem banco;
- **`tests/integration/`**: no PostgreSQL real, cobrem
  - os endpoints de livros via `TestClient`, incluindo filtros, busca, ordem, resumo e
    as respostas 404, 409 e 422;
  - o CORS: o preflight libera a origem do frontend e recusa uma origem desconhecida;
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

### Frontend (Vitest + Testing Library)

Os testes ficam em [frontend/tests/](frontend/tests/) e seguem o padrão `nome.test.js` /
`nome.test.jsx`:

- **`tests/unit/`**:
  - a validação do formulário e a formatação;
  - o cliente `request`, com o `fetch` mockado: sucesso, 204, API fora do ar, erros com
    `detail` e corpo que não é JSON;
  - o serviço de livros (cada função chama o endpoint e o método certos);
  - os componentes isolados, como o formulário (avaliação só em livro lido), o cartão
    (status, estrelas, "ver mais", exclusão com confirmação) e os filtros;
- **`tests/integration/`**: a página inteira com o serviço de livros mockado, cobrindo
  carregamento, lista vazia, API fora do ar com "Tentar novamente", filtros, cadastro,
  edição, ações rápidas, exclusão e as mensagens de erro da API (404, 409 e 422).

```bash
make front-test               # unitários + integração
make front-test-unit          # só os unitários
make front-test-integration   # só os de integração
```

## CI (GitHub Actions)

### Backend

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

### Frontend

O workflow [.github/workflows/ci-frontend.yml](.github/workflows/ci-frontend.yml) roda em
**push** e **pull request** para qualquer branch, sempre que algo em `frontend/` ou o
próprio workflow mudar. Os dois jobs usam Node.js 26 com cache do npm e `npm ci`.

**Lint e formatação (Biome):** `npm run check` (lint, formatação e ordem dos imports).

**Testes e build**, que só rodam se o lint passar (`needs: lint`): testes unitários,
testes de integração e `npm run build`.

Rode `make help` para ver todos os comandos.
