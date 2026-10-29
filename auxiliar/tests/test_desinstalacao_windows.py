"""Desinstalação no Windows: registro primeiro, hosts conferidos antes de encerrar (RF-12, D-17)."""

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from whispper_motor import instalacao, plataforma
from whispper_motor.__main__ import PASTA_DE_HOSTS, PREFIXO_TEMPORARIO

from .suporte.ambiente_windows import MODELO_CT2, ambiente_de_instalacao, ler_valor_padrao

CODIGO = Path(instalacao.__file__).resolve().parent
ID = "femjlfnijaboogbcdionddnjcjpfmieg"
ORIGEM = f"chrome-extension://{ID}/"


def chaves(raiz):
    return [chave for _, chave in instalacao.chaves_do_registro(raiz)]


def instalado(ambiente_windows):
    ambiente = ambiente_de_instalacao(ambiente_windows)
    instalacao.instalar(ambiente, ID, CODIGO)
    return ambiente


def desinstalar(ambiente_windows, encerrados=None):
    return instalacao.desinstalar(
        ambiente_windows.perfil, hosts_encerrados=encerrados, raiz_do_registro=ambiente_windows.raiz_do_registro
    )


def dormir():
    return subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])


def encerrar(processo):
    if processo.poll() is None:
        processo.kill()
    processo.wait(10)


def test_desinstalar_remove_registro_e_pasta_e_preserva_o_cache(ambiente_windows):
    instalado(ambiente_windows)
    raiz = ambiente_windows.raiz_do_registro

    removidos = desinstalar(ambiente_windows)

    assert removidos == [*(rf"HKEY_CURRENT_USER\{chave}" for chave in chaves(raiz)), ambiente_windows.pasta_app]
    assert [ler_valor_padrao(chave) for chave in chaves(raiz)] == [None, None]
    assert not ambiente_windows.pasta_app.exists()
    modelo = "models--" + MODELO_CT2.replace("/", "--")
    assert (ambiente_windows.pasta_de_modelos / modelo).exists()
    assert desinstalar(ambiente_windows) == []


def test_registro_sai_antes_de_encerrar_os_hosts(ambiente_windows, monkeypatch):
    instalado(ambiente_windows)
    eventos = []
    apagar, encerrar_hosts = instalacao._apagar_registro, instalacao.encerrar_hosts

    def espiar_registro(chave):
        eventos.append(("registro", chave))
        return apagar(chave)

    def espiar_hosts(pasta):
        eventos.append(("hosts", pasta))
        return encerrar_hosts(pasta)

    monkeypatch.setattr(instalacao, "_apagar_registro", espiar_registro)
    monkeypatch.setattr(instalacao, "encerrar_hosts", espiar_hosts)

    desinstalar(ambiente_windows)

    assert eventos == [
        *(("registro", chave) for chave in chaves(ambiente_windows.raiz_do_registro)),
        ("hosts", ambiente_windows.pasta_app),
    ]


def test_desinstalar_encerra_o_host_iniciado_como_pelo_navegador(ambiente_windows):
    instalado(ambiente_windows)
    lancador = ambiente_windows.pasta_app / "whispper-motor.bat"
    host = subprocess.Popen(
        f'cmd.exe /d /s /c ""{lancador}" {ORIGEM} --parent-window=0"',
        cwd=lancador.parent,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    try:
        with plataforma.Leitor(host.stdout) as leitor:
            # Qualquer estado serve: com o modelo falso, o host segue vivo mesmo em "erro".
            assert instalacao._pedir_estado(host, leitor)["tipo"] == "estado"
            [registro] = list((ambiente_windows.pasta_app / PASTA_DE_HOSTS).iterdir())
            encerrados = []

            desinstalar(ambiente_windows, encerrados)

            # O PID do host real, registrado por ele, e não o do cmd.exe nem o do lançador.
            assert encerrados == [int(registro.name)]
            assert leitor.ler(4096, time.monotonic() + 10) == b""
        host.wait(10)
        assert not ambiente_windows.pasta_app.exists()
    finally:
        encerrar(host)
        host.stdout.close()


def test_pid_reaproveitado_por_outro_executavel_nao_e_encerrado(ambiente_windows):
    instalado(ambiente_windows)
    alheio = subprocess.Popen(["ping", "-n", "60", "127.0.0.1"], stdout=subprocess.DEVNULL)
    try:
        registros = ambiente_windows.pasta_app / PASTA_DE_HOSTS
        registros.mkdir(exist_ok=True)
        (registros / str(alheio.pid)).touch()
        encerrados = []

        desinstalar(ambiente_windows, encerrados)

        assert encerrados == []
        time.sleep(0.3)
        assert alheio.poll() is None
    finally:
        encerrar(alheio)


def test_pid_reaproveitado_por_python_iniciado_depois_do_registro_nao_e_encerrado(ambiente_windows):
    instalado(ambiente_windows)
    alheio = dormir()
    try:
        registros = ambiente_windows.pasta_app / PASTA_DE_HOSTS
        registros.mkdir(exist_ok=True)
        registro = registros / str(alheio.pid)
        registro.touch()
        # O registro é de um host que já morreu: anterior ao início do processo que herdou o PID.
        antes = time.time() - 60
        os.utime(registro, (antes, antes))
        encerrados = []

        desinstalar(ambiente_windows, encerrados)

        assert encerrados == []
        time.sleep(0.3)
        assert alheio.poll() is None
    finally:
        encerrar(alheio)


def test_desinstalar_varre_as_pastas_temporarias_orfas(ambiente_windows, tmp_path, monkeypatch):
    instalado(ambiente_windows)
    base = tmp_path / "temp"
    base.mkdir()
    monkeypatch.setattr(tempfile, "tempdir", str(base))
    morto = subprocess.Popen([sys.executable, "-c", "pass"])
    morto.wait()
    vivo = dormir()
    try:
        orfa = base / f"{PREFIXO_TEMPORARIO}{morto.pid}-abc123"
        de_vivo = base / f"{PREFIXO_TEMPORARIO}{vivo.pid}-def456"
        for pasta in (orfa, de_vivo):
            pasta.mkdir()
            (pasta / "audio.m4a").write_bytes(b"audio de terceiro")

        desinstalar(ambiente_windows)

        assert not orfa.exists()
        assert de_vivo.exists()
        assert vivo.poll() is None
    finally:
        encerrar(vivo)
