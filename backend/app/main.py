from fastapi import FastAPI

from app.api.router import api_router


def create_app() -> FastAPI:
    application = FastAPI(title="Sistemas Distribuidos - Backend")
    application.include_router(api_router)
    return application


app = create_app()
