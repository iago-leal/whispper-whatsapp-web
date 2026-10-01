"""Instalador do macOS que a página de boas-vindas oferece (RF-07, BUG-20261001-MAC1).

Gera o pacote com `auxiliar/ferramentas/gerar_pkg.sh` e roda o postinstall dele numa pasta pessoal
isolada, com o PATH mínimo do Instalador: nada é instalado na conta de quem roda os testes.
"""

import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from whispper_motor import NOME_DO_HOST
from whispper_motor.instalacao import caminho_manifesto_host, identificador_da_extensao, ler_key

from .suporte.cache import criar_snapshot

RAIZ = Path(__file__).resolve().parents[2]
GERADOR = RAIZ / "auxiliar" / "ferramentas" / "gerar_pkg.sh"
MANIFESTO = RAIZ / "extension" / "manifest.json"
MODELO = "mlx-community/whisper-large-v3-turbo"
PATH_DO_INSTALADOR = "/usr/bin:/bin:/usr/sbin:/sbin"
LOG = Path("Library") / "Logs" / "whispper-motor-instalacao.log"

pytestmark = pytest.mark.skipif(
    platform.system() != "Darwin" or not (shutil.which("pkgbuild") and shutil.which("productbuild")),
    reason="o instalador .pkg só se gera no macOS",
)


@pytest.fixture(scope="module")
def pacote(tmp_path_factory) -> Path:
    destino = tmp_path_factory.mktemp("pkg") / "whispper-macos-apple-silicon.pkg"
    # Fora da raiz do repositório: o gerador acha os arquivos pelo próprio caminho.
    subprocess.run(["bash", str(GERADOR), str(destino)], cwd=destino.parent, check=True, capture_output=True)
    return destino


@pytest.fixture(scope="module")
def scripts(pacote, tmp_path_factory) -> Path:
    expandido = tmp_path_factory.mktemp("expandido") / "pkg"
    subprocess.run(["pkgutil", "--expand", str(pacote), str(expandido)], check=True)
    (componente,) = [item for item in expandido.iterdir() if item.suffix == ".pkg"]
    return componente / "Scripts"


@pytest.fixture
def home(tmp_path) -> Path:
    home = tmp_path / "home"
    criar_snapshot(home / ".cache" / "huggingface" / "hub", MODELO)
    return home


def rodar_postinstall(scripts: Path, pacote: Path, home: Path, python: str) -> subprocess.CompletedProcess:
    # Os argumentos e o ambiente que o Instalador passa num pacote de domínio do usuário.
    ambiente = {
        "HOME": str(home),
        "PATH": PATH_DO_INSTALADOR,
        "WHISPPER_PYTHON": python,
        "PYTHONDONTWRITEBYTECODE": "1",
    }
    return subprocess.run(
        ["/bin/bash", str(scripts / "postinstall"), str(pacote), str(home), "/", "/"],
        cwd=scripts,
        env=ambiente,
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_gerador_produz_pacote_xar(pacote):
    # O "instalador" baixado era o HTML da página de boas-vindas.
    assert pacote.read_bytes()[:4] == b"xar!"


def test_instala_so_na_pasta_do_usuario(pacote):
    dominios = subprocess.run(
        ["installer", "-pkg", str(pacote), "-dominfo"], check=True, capture_output=True, text=True
    )
    assert dominios.stdout.split() == ["CurrentUserHomeDirectory"]


def test_scripts_levam_motor_e_key_sem_lixo(scripts):
    # O pkgutil --expand mostra os atributos estendidos como ._*; o Instalador os devolve aos arquivos.
    arquivos = {
        item.relative_to(scripts).as_posix()
        for item in scripts.rglob("*")
        if item.is_file() and not item.name.startswith("._")
    }
    codigo = {f"auxiliar/whispper_motor/{item.name}" for item in (RAIZ / "auxiliar" / "whispper_motor").glob("*.py")}
    assert arquivos == {"postinstall", "auxiliar/motor.sh", "extension/manifest.json"} | codigo
    assert os.access(scripts / "postinstall", os.X_OK)
    assert os.access(scripts / "auxiliar" / "motor.sh", os.X_OK)
    assert ler_key(scripts / "extension" / "manifest.json") == ler_key(MANIFESTO)


def test_postinstall_registra_o_host_para_a_extensao(scripts, pacote, home, ffmpeg):
    pytest.importorskip("mlx_whisper")
    resultado = rodar_postinstall(scripts, pacote, home, sys.executable)
    log = home / LOG
    assert resultado.returncode == 0, log.read_text() if log.exists() else resultado.stderr

    manifesto = json.loads(caminho_manifesto_host(home).read_text())
    assert manifesto["name"] == NOME_DO_HOST
    assert manifesto["allowed_origins"] == [f"chrome-extension://{identificador_da_extensao(ler_key(MANIFESTO))}/"]
    assert os.access(manifesto["path"], os.X_OK)


def test_postinstall_falha_quando_a_instalacao_falha(scripts, pacote, home, tmp_path):
    # O gerador antigo terminava com exit 0, e o Instalador declarava sucesso sem nada registrado.
    resultado = rodar_postinstall(scripts, pacote, home, str(tmp_path / "python-inexistente"))
    assert resultado.returncode != 0
    assert "python-inexistente" in (home / LOG).read_text()
    assert not caminho_manifesto_host(home).exists()
