from pathlib import Path

import pytest

TESTS_DIR = Path(__file__).parent
SUITES = ("unit", "integration")


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Marca cada teste como unit ou integration conforme a pasta em que ele esta.

    Testes fora dessas pastas sao recusados, para que o CI (que roda cada suite
    separadamente) nunca deixe algum teste de fora.
    """
    for item in items:
        suite = item.path.relative_to(TESTS_DIR).parts[0]
        if suite not in SUITES:
            raise pytest.UsageError(
                f"{item.nodeid}: todo teste deve ficar em tests/unit/ ou tests/integration/"
            )
        item.add_marker(getattr(pytest.mark, suite))
