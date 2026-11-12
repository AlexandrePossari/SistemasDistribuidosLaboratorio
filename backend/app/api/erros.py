from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.services.livro import AvaliacaoInvalidaError, LivroDuplicadoError, LivroNaoEncontradoError

# Erros de dominio -> status HTTP. As rotas so chamam o service; a traducao fica aqui.
STATUS_POR_ERRO: dict[type[Exception], int] = {
    LivroNaoEncontradoError: status.HTTP_404_NOT_FOUND,
    LivroDuplicadoError: status.HTTP_409_CONFLICT,
    AvaliacaoInvalidaError: status.HTTP_422_UNPROCESSABLE_CONTENT,
}


def registrar_tratadores_de_erro(application: FastAPI) -> None:
    for tipo, codigo in STATUS_POR_ERRO.items():
        application.add_exception_handler(tipo, _tratador(codigo))


def _tratador(codigo: int):
    async def tratar(_request: Request, erro: Exception) -> JSONResponse:
        return JSONResponse(status_code=codigo, content={"detail": str(erro)})

    return tratar
