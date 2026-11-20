import pytest
from pydantic import ValidationError

from app.schemas.health import Health


def test_health_aceita_os_estados_conhecidos() -> None:
    assert Health(status="ok", banco="ok").model_dump() == {"status": "ok", "banco": "ok"}
    assert Health(status="erro", banco="indisponivel").banco == "indisponivel"


@pytest.mark.parametrize(
    "dados",
    [{"status": "talvez", "banco": "ok"}, {"status": "ok", "banco": "lento"}, {"status": "ok"}],
)
def test_health_recusa_valores_fora_do_contrato(dados: dict) -> None:
    with pytest.raises(ValidationError):
        Health(**dados)
