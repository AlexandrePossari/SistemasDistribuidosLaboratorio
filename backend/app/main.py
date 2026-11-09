from fastapi import FastAPI

from app.api.cors import configurar_cors
from app.api.router import api_router


def create_app() -> FastAPI:
    application = FastAPI(title="Sistemas Distribuidos - Backend")
    configurar_cors(application)
    application.include_router(api_router)
    return application


app = create_app()
