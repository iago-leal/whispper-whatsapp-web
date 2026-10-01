import pytest

from whispper_motor import modelos
from whispper_motor.modelos import ModeloNaoEncontrado

from .suporte.cache import criar_snapshot


def test_resolve_repositorio_por_refs_main(tmp_path):
    esperado = criar_snapshot(tmp_path, "mlx-community/whisper-large-v3-turbo")
    criar_snapshot(tmp_path / "outro", "mlx-community/whisper-large-v3-turbo", hash_="velho")

    assert modelos.resolver("mlx-community/whisper-large-v3-turbo", tmp_path) == esperado


def test_aceita_pesos_em_npz(tmp_path):
    esperado = criar_snapshot(tmp_path, "org/modelo", arquivos=("config.json", "weights.npz"))

    assert modelos.resolver("org/modelo", tmp_path) == esperado


def test_aceita_caminho_absoluto(tmp_path):
    pasta = tmp_path / "meu-modelo"
    pasta.mkdir()
    (pasta / "config.json").write_text("{}")
    (pasta / "weights.safetensors").write_text("")

    assert modelos.resolver(str(pasta), tmp_path / "cache") == pasta


@pytest.mark.parametrize(
    "preparar",
    [
        lambda cache: None,
        lambda cache: criar_snapshot(cache, "org/modelo", arquivos=("config.json",)),
        lambda cache: (criar_snapshot(cache, "org/modelo"), (cache / "models--org--modelo" / "refs" / "main").write_text("inexistente")),
    ],
    ids=["repositorio-ausente", "sem-pesos", "refs-para-snapshot-ausente"],
)
def test_modelo_nao_encontrado(tmp_path, preparar):
    preparar(tmp_path)

    with pytest.raises(ModeloNaoEncontrado) as erro:
        modelos.resolver("org/modelo", tmp_path)

    assert str(erro.value) == "modelo não encontrado"


def test_caminho_absoluto_inexistente(tmp_path):
    with pytest.raises(ModeloNaoEncontrado):
        modelos.resolver(str(tmp_path / "nada"), tmp_path)
