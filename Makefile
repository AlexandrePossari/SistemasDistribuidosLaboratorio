POETRY := poetry
COMPOSE := docker compose
BACKEND_DIR := backend
FRONTEND_DIR := frontend
NPM := npm
API_SERVICE := api
DB_SERVICE := db
APP := app.main:app
HOST := 0.0.0.0
PORT := 8000

.PHONY: help install run dev clean \
        format lint \
        test test-v test-unit test-integration \
        migrate migration downgrade db-current db-history \
        front-install front-dev front-build front-preview front-format front-lint \
        front-test front-test-unit front-test-integration front-e2e-install front-test-e2e \
        test-all \
        build up up-build down restart rebuild logs ps sh db-shell health

help:
	@echo "Minha Biblioteca - comandos disponiveis"
	@echo ""
	@echo " Backend local (Poetry):"
	@echo "  make install          - Instala as dependencias do backend (inclui o grupo dev)"
	@echo "  make run              - Roda a API (FastAPI + Uvicorn)"
	@echo "  make dev              - Roda a API com reload automatico"
	@echo "  make clean            - Remove caches do Python, do Pytest e do Ruff"
	@echo ""
	@echo " Qualidade (Ruff):"
	@echo "  make format           - Formata o codigo e organiza os imports"
	@echo "  make lint             - Verifica lint e formatacao sem alterar arquivos"
	@echo ""
	@echo " Testes (Pytest):"
	@echo "  make test             - Roda todos os testes do backend (exige o PostgreSQL: make up)"
	@echo "  make test-v           - Roda os testes em modo verboso"
	@echo "  make test-unit        - Roda apenas os testes unitarios (sem banco)"
	@echo "  make test-integration - Roda apenas os testes de integracao (exige o PostgreSQL)"
	@echo ""
	@echo " Migrations (Alembic):"
	@echo "  make migrate          - Aplica as migrations pendentes (alembic upgrade head)"
	@echo "  make migration M=msg  - Gera uma migration a partir dos modelos (autogenerate)"
	@echo "  make downgrade        - Desfaz a ultima migration"
	@echo "  make db-current       - Mostra a migration atual do banco"
	@echo "  make db-history       - Lista o historico de migrations"
	@echo ""
	@echo " Frontend (npm):"
	@echo "  make front-install          - Instala as dependencias do frontend (npm ci)"
	@echo "  make front-dev              - Roda o Vite em http://localhost:5173"
	@echo "  make front-build            - Gera o build de producao em frontend/dist"
	@echo "  make front-preview          - Serve o build de producao localmente"
	@echo "  make front-format           - Formata, organiza imports e aplica correcoes (Biome)"
	@echo "  make front-lint             - Verifica lint, formatacao e imports sem alterar arquivos"
	@echo "  make front-test             - Roda os testes unitarios e de integracao (Vitest)"
	@echo "  make front-test-unit        - Roda apenas os testes unitarios"
	@echo "  make front-test-integration - Roda apenas os testes de integracao"
	@echo "  make front-e2e-install      - Instala o Chromium usado pelo Playwright"
	@echo "  make front-test-e2e         - Roda os testes E2E (Playwright; exige a stack: make up)"
	@echo ""
	@echo " Todos os testes:"
	@echo "  make test-all         - Sobe a stack e roda backend (Pytest), frontend (Vitest) e E2E"
	@echo ""
	@echo " Docker Compose:"
	@echo "  make build            - Constroi as imagens"
	@echo "  make up               - Sobe PostgreSQL, API e frontend em background"
	@echo "  make up-build         - Reconstroi as imagens e sobe tudo em background"
	@echo "  make down             - Derruba os containers (os dados ficam no volume)"
	@echo "  make restart          - Reinicia os servicos"
	@echo "  make rebuild          - Reconstroi as imagens sem cache e sobe tudo"
	@echo "  make logs             - Acompanha os logs dos servicos"
	@echo "  make ps               - Mostra o status dos servicos"
	@echo "  make sh               - Abre um shell no container da API"
	@echo "  make db-shell         - Abre o psql no container do banco"
	@echo "  make health           - Consulta o /health da API"

install:
	cd $(BACKEND_DIR) && $(POETRY) install

run:
	cd $(BACKEND_DIR) && $(POETRY) run uvicorn $(APP) --host $(HOST) --port $(PORT)

dev:
	cd $(BACKEND_DIR) && $(POETRY) run uvicorn $(APP) --host $(HOST) --port $(PORT) --reload

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -prune -exec rm -rf {} +

format:
	cd $(BACKEND_DIR) && $(POETRY) run ruff check --fix .
	cd $(BACKEND_DIR) && $(POETRY) run ruff format .

lint:
	cd $(BACKEND_DIR) && $(POETRY) run ruff check .
	cd $(BACKEND_DIR) && $(POETRY) run ruff format --check .

test:
	cd $(BACKEND_DIR) && $(POETRY) run pytest

test-v:
	cd $(BACKEND_DIR) && $(POETRY) run pytest -v

test-unit:
	cd $(BACKEND_DIR) && $(POETRY) run pytest -v tests/unit

test-integration:
	cd $(BACKEND_DIR) && $(POETRY) run pytest -v tests/integration

migrate:
	cd $(BACKEND_DIR) && $(POETRY) run alembic upgrade head

migration:
	cd $(BACKEND_DIR) && $(POETRY) run alembic revision --autogenerate -m "$(M)"

downgrade:
	cd $(BACKEND_DIR) && $(POETRY) run alembic downgrade -1

db-current:
	cd $(BACKEND_DIR) && $(POETRY) run alembic current

db-history:
	cd $(BACKEND_DIR) && $(POETRY) run alembic history

front-install:
	cd $(FRONTEND_DIR) && $(NPM) ci

front-dev:
	cd $(FRONTEND_DIR) && $(NPM) run dev

front-build:
	cd $(FRONTEND_DIR) && $(NPM) run build

front-preview:
	cd $(FRONTEND_DIR) && $(NPM) run preview

front-format:
	cd $(FRONTEND_DIR) && $(NPM) run format

front-lint:
	cd $(FRONTEND_DIR) && $(NPM) run check

front-test:
	cd $(FRONTEND_DIR) && $(NPM) run test

front-test-unit:
	cd $(FRONTEND_DIR) && $(NPM) run test:unit

front-test-integration:
	cd $(FRONTEND_DIR) && $(NPM) run test:integration

front-e2e-install:
	cd $(FRONTEND_DIR) && $(NPM) run test:e2e:install

front-test-e2e:
	cd $(FRONTEND_DIR) && $(NPM) run test:e2e

# Sobe a stack e espera ela ficar saudavel: o PostgreSQL atende o Pytest, e a API e o
# frontend do compose atendem o Playwright. Depois roda todas as suites em sequencia.
test-all:
	$(COMPOSE) up -d --build --wait
	$(MAKE) test
	$(MAKE) front-test
	$(MAKE) front-test-e2e

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

up-build:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

rebuild:
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

sh:
	$(COMPOSE) exec $(API_SERVICE) /bin/bash

db-shell:
	$(COMPOSE) exec $(DB_SERVICE) psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-biblioteca}

health:
	curl -fsS http://localhost:$${BACKEND_PORT:-8000}/health && echo ""
