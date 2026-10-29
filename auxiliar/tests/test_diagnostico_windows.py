"""Diagnóstico no Windows: as duas entradas do registro e o host iniciado como pelo navegador (RF-13, D-18)."""

from pathlib import Path

from whispper_motor import instalacao

from .suporte.ambiente_windows import ambiente_de_instalacao, apagar_chave

CODIGO = Path(instalacao.__file__).resolve().parent
HOST_COM_DISPOSITIVO = Path(__file__).resolve().parent / "suporte" / "host_com_dispositivo.py"
ID = "femjlfnijaboogbcdionddnjcjpfmieg"
ITENS = ["registro no Chrome", "registro no Brave", "manifesto do host", "lançador", "allowed_origins", "configuração", "host"]


def instalado(ambiente_windows):
    ambiente = ambiente_de_instalacao(ambiente_windows)
    instalacao.instalar(ambiente, ID, CODIGO)
    return ambiente


def diagnosticar(ambiente_windows, extensao_id=ID, **opcoes):
    return instalacao.diagnosticar(
        ambiente_windows.perfil, extensao_id, raiz_do_registro=ambiente_windows.raiz_do_registro, **opcoes
    )


def falhas(verificacoes):
    return [nome for nome, ok, _ in verificacoes if not ok]


def test_diagnostico_confere_registro_manifesto_lancador_e_configuracao(ambiente_windows):
    instalado(ambiente_windows)

    certo = diagnosticar(ambiente_windows)
    errado = diagnosticar(ambiente_windows, "a" * 32)

    assert [nome for nome, _, _ in certo] == ITENS
    assert falhas(certo) == []
    assert falhas(errado) == ["allowed_origins"]


def test_entrada_do_brave_ausente_indica_a_reinstalacao(ambiente_windows):
    instalado(ambiente_windows)
    [_, (_, brave)] = instalacao.chaves_do_registro(ambiente_windows.raiz_do_registro)
    apagar_chave(brave)

    resultado = diagnosticar(ambiente_windows)

    assert falhas(resultado) == ["registro no Brave"]
    detalhe = dict((nome, detalhe) for nome, _, detalhe in resultado)["registro no Brave"]
    assert "motor.cmd instalar" in detalhe


def test_entrada_que_aponta_para_outro_manifesto_e_acusada(ambiente_windows):
    import winreg

    instalado(ambiente_windows)
    [(_, chrome), _] = instalacao.chaves_do_registro(ambiente_windows.raiz_do_registro)
    winreg.SetValue(winreg.HKEY_CURRENT_USER, chrome, winreg.REG_SZ, r"C:\outro\manifesto.json")

    resultado = diagnosticar(ambiente_windows)

    assert falhas(resultado) == ["registro no Chrome"]
    detalhe = dict((nome, detalhe) for nome, _, detalhe in resultado)["registro no Chrome"]
    assert r"C:\outro\manifesto.json" in detalhe


def test_diagnostico_sem_instalacao(ambiente_windows):
    resultado = dict((nome, ok) for nome, ok, _ in diagnosticar(ambiente_windows))

    assert resultado["registro no Chrome"] is False
    assert resultado["registro no Brave"] is False
    assert resultado["manifesto do host"] is False
    assert resultado["host"] is False


def test_host_iniciado_como_pelo_navegador_mostra_o_dispositivo(ambiente_windows):
    ambiente = instalado(ambiente_windows)
    lancador = ambiente_windows.pasta_app / "whispper-motor.bat"
    # O mesmo lançador, com o host cujo trabalhador simulado cai no processador.
    linhas = lancador.read_bytes().decode("oem").splitlines()
    linhas[-1] = f'"{ambiente.python}" "{HOST_COM_DISPOSITIVO}" %*'
    lancador.write_bytes("\r\n".join(linhas).encode("oem") + b"\r\n")
    # Linha de uma sessão anterior: o diagnóstico só lê o que o host dele escreveu.
    log = ambiente_windows.pasta_app / "diagnostico.log"
    log.write_text("2026-10-29T08:00:00 info modelo carregado na placa de vídeo\n", encoding="utf-8")

    resultado = diagnosticar(ambiente_windows, aguardar_pronto_s=15)

    assert falhas(resultado) == [], "\n".join(detalhe for _, ok, detalhe in resultado if not ok)
    host = dict((nome, detalhe) for nome, _, detalhe in resultado)["host"]
    assert "pronto" in host
    assert host.endswith("modelo carregado no processador: sem placa NVIDIA")
    assert "placa de vídeo" not in host
    registro = log.read_text(encoding="utf-8")
    assert f"argumentos do host: chrome-extension://{ID}/ --parent-window=0" in registro
