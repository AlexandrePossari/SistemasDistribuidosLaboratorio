from fastapi import FastAPI, HTTPException

app = FastAPI()


@app.get("/")
def read_root():
    return {"status": "ok"}


@app.get("/soma")
def soma(a: float, b: float):
    return {"resultado": a + b}


@app.get("/divisao")
def divisao(a: float, b: float):
    if b == 0:
        raise HTTPException(status_code=400, detail="Divisao por zero nao e permitida")
    return {"resultado": a / b}
