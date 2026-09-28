from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def somar(client: TestClient) -> Callable:
    def _somar(a: object, b: object):
        return client.get("/soma", params={"a": a, "b": b})

    return _somar


@pytest.fixture
def dividir(client: TestClient) -> Callable:
    def _dividir(a: object, b: object):
        return client.get("/divisao", params={"a": a, "b": b})

    return _dividir
