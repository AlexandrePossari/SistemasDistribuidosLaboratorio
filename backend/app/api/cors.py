import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Origem do Vite (npm run dev / container do frontend) com localhost e 127.0.0.1.
CORS_ORIGINS_PADRAO = ("http://localhost:5173", "http://127.0.0.1:5173")

METODOS_PERMITIDOS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
HEADERS_PERMITIDOS = ["Content-Type"]


def get_cors_origins() -> list[str]:
    """Origens autorizadas a chamar a API pelo navegador, lidas de CORS_ORIGINS.

    A variavel aceita varias origens separadas por virgula. O curinga "*" e recusado:
    cada origem precisa ser explicita.
    """
    valor = os.getenv("CORS_ORIGINS", "")
    origens = [origem.strip().rstrip("/") for origem in valor.split(",") if origem.strip()]
    if not origens:
        return list(CORS_ORIGINS_PADRAO)
    if "*" in origens:
        raise ValueError("CORS_ORIGINS nao aceita '*': informe as origens explicitamente")
    return origens


def configurar_cors(application: FastAPI) -> None:
    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=False,
        allow_methods=METODOS_PERMITIDOS,
        allow_headers=HEADERS_PERMITIDOS,
    )
