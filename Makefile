POETRY := poetry
COMPOSE := docker compose
BACKEND_DIR := backend
BACKEND_SERVICE := backend
DB_SERVICE := db
APP := src.main:app
HOST := 0.0.0.0
PORT := 8000

.PHONY: help install run dev shell lock update clean \
        build up down restart logs ps sh db-shell rebuild health

help:
	@echo "Comandos disponiveis:"
	@echo ""
	@echo " Local (Poetry):"
	@echo "  make install  - Instala as dependencias do backend com Poetry"
	@echo "  make run      - Roda o servidor FastAPI"
	@echo "  make dev      - Roda o servidor FastAPI em modo reload"
	@echo "  make shell    - Abre um shell dentro do virtualenv do Poetry"
	@echo "  make lock     - Atualiza o arquivo poetry.lock"
	@echo "  make update   - Atualiza as dependencias do projeto"
	@echo "  make clean    - Remove caches Python"
	@echo ""
	@echo " Docker:"
	@echo "  make build    - Constroi as imagens do docker compose"
	@echo "  make up       - Sobe backend e banco em background"
	@echo "  make down     - Derruba os servicos e remove os containers"
	@echo "  make restart  - Reinicia os servicos"
	@echo "  make rebuild  - Reconstroi as imagens sem cache e sobe tudo"
	@echo "  make logs     - Acompanha os logs dos servicos"
	@echo "  make ps       - Lista o status dos servicos"
	@echo "  make sh       - Abre um shell no container do backend"
	@echo "  make db-shell - Abre o psql no container do banco"
	@echo "  make health   - Consulta o endpoint raiz da API"

install:
	cd $(BACKEND_DIR) && $(POETRY) install

run:
	cd $(BACKEND_DIR) && $(POETRY) run uvicorn $(APP) --host $(HOST) --port $(PORT)

dev:
	cd $(BACKEND_DIR) && $(POETRY) run uvicorn $(APP) --host $(HOST) --port $(PORT) --reload

shell:
	cd $(BACKEND_DIR) && $(POETRY) shell

lock:
	cd $(BACKEND_DIR) && $(POETRY) lock

update:
	cd $(BACKEND_DIR) && $(POETRY) update

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

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
	$(COMPOSE) exec $(BACKEND_SERVICE) /bin/bash

db-shell:
	$(COMPOSE) exec $(DB_SERVICE) psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-sistemas_distribuidos}

health:
	curl -fsS http://localhost:$(PORT)/ && echo ""
