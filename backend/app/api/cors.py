import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Origem do frontend (Vite), com localhost e 127.0.0.1.
CORS_ORIGINS_PADRAO = ("http://localhost:5173", "http://127.0.0.1:5173")

# Exatamente os metodos e headers que o frontend usa.
METODOS_PERMITIDOS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
HEADERS_PERMITIDOS = ["Content-Type"]


def get_cors_origins() -> list[str]:
    """Origens que o navegador pode usar para chamar a API, lidas de CORS_ORIGINS.

    Aceita varias origens separadas por virgula. O curinga "*" e recusado: cada origem
    precisa ser explicita.
    """
    valor = os.getenv("CORS_ORIGINS", "")
    origens = [origem.strip().rstrip("/") for origem in valor.split(",") if origem.strip()]
    if not origens:
        return list(CORS_ORIGINS_PADRAO)
    if "*" in origens:
        raise ValueError("CORS_ORIGINS não aceita '*': informe as origens explicitamente")
    return origens


def configurar_cors(application: FastAPI) -> None:
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=False,
        allow_methods=METODOS_PERMITIDOS,
        allow_headers=HEADERS_PERMITIDOS,
    )
