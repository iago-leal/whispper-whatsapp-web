from datetime import datetime

from whispper_motor import registro
from whispper_motor.registro import RegistroDeDesempenho


def linhas(caminho):
    return [linha.split("\t") for linha in caminho.read_text(encoding="utf-8").splitlines()]


def test_cabecalho_e_colunas_por_evento(tmp_path):
    caminho = tmp_path / "desempenho.tsv"
    reg = RegistroDeDesempenho(caminho)

    reg.carregamento(3140, "ok")
    reg.pedido(42.0, 3100, "ok")
    reg.pedido(0.0, 12, "FALHA_NA_TRANSCRICAO")
    reg.descarregamento()

    cabecalho, carregamento, pedido, falha, descarregamento = linhas(caminho)
    assert cabecalho == ["instante", "evento", "duracao_audio_seg", "processamento_ms", "resultado"]
    assert carregamento[1:] == ["carregamento", "", "3140", "ok"]
    assert pedido[1:] == ["pedido", "42.0", "3100", "ok"]
    assert falha[1:] == ["pedido", "0.0", "12", "FALHA_NA_TRANSCRICAO"]
    assert descarregamento[1:] == ["descarregamento", "", "", "ok"]
    assert datetime.fromisoformat(pedido[0]).tzinfo is not None


def test_poda_as_linhas_mais_antigas(tmp_path):
    caminho = tmp_path / "desempenho.tsv"
    reg = RegistroDeDesempenho(caminho, limite=5)

    for ms in range(1, 9):
        reg.pedido(1.0, ms, "ok")

    cabecalho, *dados = linhas(caminho)
    assert cabecalho[0] == "instante"
    assert [d[3] for d in dados] == ["4", "5", "6", "7", "8"]


def test_retoma_arquivo_existente(tmp_path):
    caminho = tmp_path / "desempenho.tsv"
    RegistroDeDesempenho(caminho).pedido(1.0, 1, "ok")

    RegistroDeDesempenho(caminho).pedido(2.0, 2, "ok")

    assert len(linhas(caminho)) == 3


def test_diagnostico_truncado_acima_do_limite(tmp_path):
    caminho = tmp_path / "diagnostico.log"
    conteudo = b"".join(f"linha {i:07d}\n".encode() for i in range(120_000))
    caminho.write_bytes(conteudo)

    registro.truncar_diagnostico(caminho)

    assert caminho.stat().st_size <= registro.DIAGNOSTICO_MANTER
    assert conteudo.endswith(caminho.read_bytes())


def test_diagnostico_pequeno_intacto(tmp_path):
    caminho = tmp_path / "diagnostico.log"
    caminho.write_text("pouco\n")

    registro.truncar_diagnostico(caminho)

    assert caminho.read_text() == "pouco\n"


def test_arquivo_trocado_por_outra_codificacao_na_rotacao(tmp_path):
    caminho = tmp_path / "desempenho.tsv"
    reg = RegistroDeDesempenho(caminho, limite=3)
    for ms in range(3):
        reg.pedido(1.0, ms, "ok")
    # Por exemplo, aberto e salvo numa planilha em UTF-16 com o host em execução.
    caminho.write_bytes(caminho.read_text(encoding="utf-8").encode("utf-16"))

    reg.pedido(1.0, 9, "ok")
    reg.pedido(1.0, 10, "ok")

    cabecalho, *dados = linhas(caminho)
    assert tuple(cabecalho) == registro.CABECALHO
    assert [d[3] for d in dados] == ["10"]
