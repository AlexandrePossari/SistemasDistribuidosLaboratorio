POETRY := poetry
BACKEND_DIR := backend
APP := main:app
HOST := 0.0.0.0
PORT := 8000

.PHONY: help install run dev shell lock update clean

help:
	@echo "Comandos disponiveis:"
	@echo "  make install  - Instala as dependencias do backend com Poetry"
	@echo "  make run      - Roda o servidor FastAPI"
	@echo "  make dev      - Roda o servidor FastAPI em modo reload"
	@echo "  make shell    - Abre um shell dentro do virtualenv do Poetry"
	@echo "  make lock     - Atualiza o arquivo poetry.lock"
	@echo "  make update   - Atualiza as dependencias do projeto"
	@echo "  make clean    - Remove caches Python"

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