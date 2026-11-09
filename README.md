# sistemas-distribuidos-2026.2

Repositório para a disciplina de Sistemas Distribuídos - 2026.2

## Estrutura

```
.
├── .github/workflows/
│   ├── ci-backend.yml                 # Pipeline de CI do backend (lint + testes)
│   └── ci-frontend.yml                # Pipeline de CI do frontend (lint + testes)
├── backend/
│   ├── app/
│   │   ├── main.py                    # Inicializa a aplicação FastAPI (CORS + routers)
│   │   ├── api/
│   │   │   ├── cors.py                # CORS: origens explícitas lidas de CORS_ORIGINS
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
├── frontend/
│   ├── src/
│   │   ├── main.jsx                   # Ponto de entrada: monta o React no #root
│   │   ├── App.jsx                    # Layout da aplicação
│   │   ├── index.css                  # Apenas @import "tailwindcss"
│   │   ├── pages/                     # Páginas (CarsPage carrega e altera os carros pela API)
│   │   ├── components/                # Componentes reutilizáveis (formulário, lista, item, filtro)
│   │   ├── services/                  # Chamadas HTTP: api.js (cliente) e cars.js (endpoints /cars)
│   │   └── utils/                     # Funções puras: validação e formatação
│   ├── tests/
│   │   ├── setup.js                   # jest-dom + cleanup do Testing Library
│   │   ├── unit/                      # Funções, serviços (fetch mockado) e componentes isolados
│   │   ├── integration/               # Página inteira com o serviço de carros mockado
│   │   └── e2e/                       # Fluxos no navegador contra a stack real (*.spec.js)
│   ├── index.html
│   ├── package.json                   # Dependências e scripts npm
│   ├── vite.config.js                 # Vite, plugins React/Tailwind e config do Vitest
│   ├── playwright.config.js           # Navegador, servidores e relatórios dos testes E2E
│   ├── biome.json                     # Regras de lint e formatação do Biome
│   ├── .env.example                   # VITE_API_URL para rodar o Vite fora do Docker
│   └── Dockerfile
├── docker-compose.yml                 # PostgreSQL + backend + frontend
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
| `BACKEND_PORT`      | Porta publicada da API (padrão `8000`) |
| `FRONTEND_PORT`     | Porta publicada do frontend (padrão `5173`) |
| `CORS_ORIGINS`      | Origens que o navegador pode usar para chamar a API, separadas por vírgula. `*` é recusado |
| `VITE_API_URL`      | URL da API usada pelo frontend (padrão `http://localhost:${BACKEND_PORT}`) |

Dentro do Docker Compose, o backend recebe `DATABASE_URL` apontando para o host `db`.

`VITE_API_URL` é a URL da API **vista pelo navegador**, que roda na máquina do usuário e
não dentro da rede do Compose. Por isso ela usa `localhost` e a porta publicada, e não o
host `backend`. Se alguma porta padrão já estiver em uso por outro projeto, basta trocar
`BACKEND_PORT` e/ou `FRONTEND_PORT` no `.env`: sem `VITE_API_URL` e `CORS_ORIGINS`
definidos, o Compose deriva os dois dessas portas.

## Instalação

```bash
make install
```

O comando executa `poetry install` dentro de `backend/`, instalando as dependências
de produção e o grupo `dev` (Pytest, cliente HTTP de teste e Ruff).

## Executando a aplicação

### Com Docker Compose (recomendado)

```bash
make up-build   # constrói as imagens e sobe os 3 serviços
make logs       # acompanha os logs
make down       # derruba os containers (os dados continuam no volume postgres_data)
```

| Serviço    | Container     | Endereço |
|------------|---------------|----------|
| `db`       | `sd-db`       | PostgreSQL em `localhost:5432` |
| `backend`  | `sd-backend`  | API em http://localhost:8000 (Swagger em `/docs`) |
| `frontend` | `sd-frontend` | Aplicação em http://localhost:5173 |

Os serviços sobem em cascata com `depends_on` + healthcheck: o backend só inicia depois
que o PostgreSQL está saudável, e o frontend só depois que a API responde.

Ao subir, o container do backend executa `alembic upgrade head` antes do Uvicorn,
então o banco sempre está com todas as migrations aplicadas. Os dados ficam no volume
`postgres_data` e permanecem após reiniciar a API ou recriar os containers.

O frontend roda o servidor de desenvolvimento do Vite com `frontend/src` montado como
volume. `VITE_WATCH_POLLING` liga o polling de arquivos, para o hot reload funcionar
também no Windows e no macOS.

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

### CORS

O frontend (porta 5173) e a API (porta 8000) são **origens diferentes**, então o navegador
só deixa o frontend ler as respostas da API se ela autorizar essa origem. O
`CORSMiddleware` é configurado em [backend/app/api/cors.py](backend/app/api/cors.py):

- **origens explícitas**, lidas de `CORS_ORIGINS`. Sem a variável, o padrão é
  `http://localhost:5173` e `http://127.0.0.1:5173`. O curinga `*` é recusado na
  inicialização;
- métodos `GET`, `POST`, `PUT`, `PATCH` e `DELETE`, e o header `Content-Type`;
- sem credenciais (`allow_credentials=False`).

O CORS é uma regra do navegador: `curl` e o `TestClient` não são bloqueados por ele.

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

## Frontend

SPA em **React** com **Vite**, escrita em JavaScript puro e estilizada com **Tailwind CSS v4**
(via plugin do Vite, sem `tailwind.config.js`). A tela gerencia carros com os mesmos campos e
regras do backend (`marca`, `modelo`, `ano` entre 1886 e 2100, `cor` e `preco` > 0).

### Integração com a API

Os dados vêm do backend, e não mais de um estado local:

```
CarsPage / componentes  →  services/cars.js  →  services/api.js (fetch)  →  FastAPI  →  PostgreSQL
```

- [services/cars.js](frontend/src/services/cars.js) reúne todas as chamadas da entidade
  carro e espelha cada endpoint do backend. Uma nova entidade ganharia o seu próprio módulo
  em `services/`.

  | Função            | Endpoint              | Uso na tela |
  |-------------------|-----------------------|-------------|
  | `listarCarros`    | `GET /cars?marca=&limite=` | Lista ao abrir a página, busca por marca e "Tentar novamente" |
  | `obterCarro`      | `GET /cars/{id}`      | "Editar" busca a versão atual antes de preencher o formulário |
  | `criarCarro`      | `POST /cars`          | "Cadastrar" |
  | `substituirCarro` | `PUT /cars/{id}`      | "Salvar alterações" na edição |
  | `atualizarCarro`  | `PATCH /cars/{id}`    | "Preço": altera só o preço |
  | `removerCarro`    | `DELETE /cars/{id}`   | "Remover" |

- [services/api.js](frontend/src/services/api.js) tem a função `request`, que trata os
  três cenários de uma requisição:
  1. **API inacessível** (o `fetch` rejeita): `ApiError` com status `0` e a mensagem
     "Não foi possível conectar à API. Verifique se o backend está rodando.";
  2. **resposta de erro** (4xx/5xx): `ApiError` com o status e o `detail` do FastAPI. Os
     erros de validação 422 viram `campo: mensagem`;
  3. **sucesso**: o JSON da resposta, ou `null` no `204` do DELETE.
- A página mostra **mensagens de erro e de sucesso** para cada operação: falha ao
  carregar a lista (com botão "Tentar novamente"), ao cadastrar, salvar, alterar o preço
  e remover. Se a API responder `404` (carro removido em outra aba, por exemplo), a lista
  é recarregada.
- O formulário faz uma **validação inicial** com as mesmas regras do schema `CarBase`,
  para não enviar dados que a API recusaria. A validação que vale é a do backend.
- Depois de cada alteração, a lista é buscada de novo, para mostrar exatamente o que
  está no banco.
- O filtro usa o `?marca=` da API, que compara a **marca exata** (sem diferenciar
  maiúsculas).

| Ferramenta | Papel | Equivalente no backend |
|------------|-------|------------------------|
| npm | Dependências e scripts | Poetry |
| Biome | Lint + formatação + ordem dos imports | Ruff |
| Vitest + Testing Library + jsdom | Testes unitários e de integração | Pytest + TestClient |
| Playwright (Chromium) | Testes E2E em navegador real | — |

### Pré-requisitos

- Node.js 22.12+ (o CI usa o Node 26) e npm

### Executando

Pelo Docker Compose (`make up-build`), o frontend já sobe junto com a API e o banco. Para
rodar o Vite direto na máquina:

```bash
cp frontend/.env.example frontend/.env   # VITE_API_URL=http://localhost:8000
make up                 # a API e o banco precisam estar no ar
make front-install      # npm ci
make front-dev          # Vite em http://localhost:5173
make front-build        # build de produção em frontend/dist
make front-preview      # serve o build localmente
```

### Qualidade de código (Biome)

```bash
make front-format       # biome check --write: formata, organiza imports e aplica correções seguras
make front-lint         # biome check: verifica tudo sem alterar arquivos
```

Dentro de `frontend/` também existem `npm run lint` (só regras de lint) e
`npm run format:check` (só formatação). A configuração fica em
[frontend/biome.json](frontend/biome.json).

### Testes

| Suíte | Pasta | Ferramenta | Comando |
|-------|-------|------------|---------|
| Unitários | `tests/unit/` | Vitest + Testing Library | `make front-test-unit` |
| Integração | `tests/integration/` | Vitest + Testing Library + user-event | `make front-test-integration` |
| E2E | `tests/e2e/` | Playwright | `make front-test-e2e` |

- **Unitários**: validação, formatação, o cliente `request` (com o `fetch` mockado,
  cobrindo sucesso, `204`, API fora do ar, `404`, `422` e corpo que não é JSON), o
  serviço de carros (cada função chama o endpoint e o método certos) e os componentes
  isolados.
- **Integração**: a `CarsPage` inteira (formulário, filtro, lista e avisos) com o módulo
  `services/cars.js` mockado. Assim os testes cobrem a integração entre os componentes e
  as chamadas à API sem depender do backend nem do banco.
- **E2E**: usam a **stack real** (navegador → Vite → FastAPI → PostgreSQL). Eles cobrem o
  CRUD completo pela interface, a persistência após recarregar a página, o `404` devolvido
  pela API, a validação do formulário e a mensagem quando a API está fora do ar
  (simulada com `page.route`). Cada teste usa uma marca única (`E2E-...`) e apaga pela API
  o que cadastrou, então os dados que já estão no banco não são afetados.
- Os arquivos do Vitest seguem o padrão `nome.test.js` / `nome.test.jsx`; os do Playwright,
  `nome.spec.js`. O `include` do Vitest em `vite.config.js` aponta só para `unit/` e
  `integration/`, para que ele não tente executar os specs do Playwright.
- `make front-test` roda unitários e de integração juntos.
- Antes do primeiro E2E, instale o navegador com `make front-e2e-install` e suba a stack
  com `make up`: o Playwright reaproveita a API e o Vite que já estão rodando. No CI, ele
  mesmo sobe os dois (`webServer` em `playwright.config.js`). O relatório HTML fica em
  `frontend/playwright-report/`.

## Todos os testes em um comando

```bash
make test-all
```

Sobe a stack com `docker compose up -d --build --wait` e roda, em sequência, os testes do
backend (Pytest: unitários e integração), os do frontend (Vitest: unitários e integração)
e os E2E (Playwright).

## Checklist antes do PR

```bash
make format
make lint
make front-format
make front-lint
make test-all
```

## CI (GitHub Actions)

### Backend

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

### Frontend

O workflow [.github/workflows/ci-frontend.yml](.github/workflows/ci-frontend.yml) roda em
**push** e **pull request** para qualquer branch quando algo em `frontend/`, em `backend/`
(os E2E usam a API real) ou no próprio workflow mudar. Os dois jobs usam Node.js 26 com
cache do npm e `npm ci`:

**Lint e formatação (Biome)**

1. `npm run check` (lint, formatação e ordem dos imports, sem alterar arquivos).

**Testes**, que só roda se o job de lint passar (`needs: lint`), com um PostgreSQL 16 como
*service container*:

1. testes unitários (`npm run test:unit`);
2. testes de integração (`npm run test:integration`);
3. build de produção (`npm run build`);
4. instalação do Poetry e do Python 3.12 e das dependências do backend;
5. migrations no banco do E2E (`alembic upgrade head`);
6. instalação do Chromium (`npx playwright install --with-deps chromium`);
7. testes E2E (`npm run test:e2e`): o Playwright sobe a API e o Vite e testa a stack real;
8. publicação do relatório do Playwright como artefato.
