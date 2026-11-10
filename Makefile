POETRY := poetry
COMPOSE := docker compose
BACKEND_DIR := backend
API_SERVICE := api
DB_SERVICE := db
APP := app.main:app
HOST := 0.0.0.0
PORT := 8000

.PHONY: help install run dev clean \
        format lint \
        test test-v test-unit test-integration \
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
	@echo " Docker Compose:"
	@echo "  make build            - Constroi as imagens"
	@echo "  make up               - Sobe o PostgreSQL e a API em background"
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
