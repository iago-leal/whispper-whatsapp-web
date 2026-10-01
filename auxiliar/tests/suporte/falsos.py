"""Trabalhador falso, controlável por eventos, e coletor das mensagens do servidor."""

import base64
import json
import threading
import time
from pathlib import Path

from whispper_motor.configuracao import Configuracao
from whispper_motor.registro import RegistroDeDesempenho
from whispper_motor.servidor import Servidor
from whispper_motor.trabalhador import Carregamento, PrazoExcedido, TrabalhadorCaiu, Transcricao

AMOSTRAS = Path(__file__).resolve().parents[3] / "amostras" / "sinteticas"


class TrabalhadorFalso:
    def __init__(self, fabrica):
        self.fabrica = fabrica
        self.iniciado = False
        self.encerrado = threading.Event()
        self.transcricoes = 0

    def iniciar(self):
        self.iniciado = True

    def aguardar_carregamento(self, timeout=None):
        while not self.fabrica.liberar_carregamento.wait(0.01):
            if self.encerrado.is_set():
                return Carregamento(False, "trabalhador encerrado", 0)
        return Carregamento(self.fabrica.carregamento_ok, self.fabrica.motivo_carregamento, 5)

    def transcrever(self, amostras, prazo_s):
        self.transcricoes += 1
        self.fabrica.transcricoes_recebidas.append(len(amostras))
        if self.fabrica.quedas > 0:
            self.fabrica.quedas -= 1
            raise TrabalhadorCaiu()
        if not self.fabrica.liberar_transcricao.wait(prazo_s):
            raise PrazoExcedido()
        return Transcricao(self.fabrica.texto, self.fabrica.idioma, recarregou=False)

    def encerrar(self):
        self.encerrado.set()


class FabricaFalsa:
    def __init__(self):
        self.instancias = []
        self.liberar_carregamento = threading.Event()
        self.liberar_carregamento.set()
        self.liberar_transcricao = threading.Event()
        self.liberar_transcricao.set()
        self.carregamento_ok = True
        self.motivo_carregamento = None
        self.quedas = 0
        self.texto = "texto simulado"
        self.idioma = "pt"
        self.transcricoes_recebidas = []

    def __call__(self, caminho_modelo):
        trabalhador = TrabalhadorFalso(self)
        self.instancias.append(trabalhador)
        return trabalhador


class Coletor:
    def __init__(self):
        self.mensagens = []
        self._condicao = threading.Condition()

    def __call__(self, mensagem):
        with self._condicao:
            self.mensagens.append(mensagem)
            self._condicao.notify_all()

    def esperar(self, predicado, ordem=1, timeout=5.0):
        limite = time.monotonic() + timeout
        with self._condicao:
            while True:
                achadas = [m for m in self.mensagens if predicado(m)]
                if len(achadas) >= ordem:
                    return achadas[ordem - 1]
                restante = limite - time.monotonic()
                if restante <= 0:
                    raise AssertionError(f"mensagem não chegou; recebidas: {self.mensagens}")
                self._condicao.wait(restante)

    def resposta(self, id_pedido, timeout=5.0):
        return self.esperar(lambda m: m.get("idPedido") == id_pedido, timeout=timeout)

    def estado(self, ordem=1, timeout=5.0):
        return self.esperar(lambda m: m["tipo"] == "estado", ordem=ordem, timeout=timeout)

    def nenhuma(self, predicado, durante):
        time.sleep(durante)
        with self._condicao:
            return not any(predicado(m) for m in self.mensagens)


def verificar(protocolo=1):
    return json.dumps({"tipo": "verificar", "protocolo": protocolo}).encode()


def transcrever(id_pedido, arquivo="fala-pt.ogg", midia="audio/ogg; codecs=opus", protocolo=1):
    dados = (AMOSTRAS / arquivo).read_bytes()
    return json.dumps(
        {
            "tipo": "transcrever",
            "protocolo": protocolo,
            "idPedido": id_pedido,
            "midia": midia,
            "audioBase64": base64.b64encode(dados).decode(),
        }
    ).encode()


def criar_servidor(tmp_path, ffmpeg, fabrica, coletor, *, resolver_modelo=None, config=None, registro=None, **opcoes):
    config = config or Configuracao(ffmpeg=Path(ffmpeg), pasta_de_modelos=tmp_path)
    temporarios = tmp_path / "tmp"
    temporarios.mkdir(exist_ok=True)
    servidor = Servidor(
        config,
        fabrica,
        coletor,
        registro or RegistroDeDesempenho(tmp_path / "desempenho.tsv"),
        temporarios,
        resolver_modelo=resolver_modelo or (lambda c: tmp_path / "modelo"),
        **opcoes,
    )
    servidor.iniciar()
    return servidor


def eventos_do_registro(tmp_path):
    linhas = (tmp_path / "desempenho.tsv").read_text(encoding="utf-8").splitlines()[1:]
    return [linha.split("\t")[1] for linha in linhas]
