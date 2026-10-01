// Canal de Native Messaging do Node: lança o aplicativo auxiliar verdadeiro como o Chrome o lança
// (DT-10), para que a bateria de contrato rode contra o host real sem o navegador. Reproduz o
// enquadramento (4 bytes de tamanho na ordem nativa e o JSON em UTF-8), a origem no primeiro
// argumento, o ambiente mínimo e os textos de lastError com que o Chrome relata a desconexão.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { accessSync, constants, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { endianness, homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import contrato from "../../../contratos/protocolo-1.json" with { type: "json" };
import type { CanalNativo, PortaNativa } from "../../src/adaptadores/motor-local/canal-nativo.ts";

const ID_DA_EXTENSAO = "femjlfnijaboogbcdionddnjcjpfmieg";
const ORIGEM = `chrome-extension://${ID_DA_EXTENSAO}/`;
const AUXILIAR = fileURLToPath(new URL("../../../auxiliar", import.meta.url));

// PATH com que o macOS lança os aplicativos e, portanto, o Chrome lança o host.
const PATH_DO_CHROME = "/usr/bin:/bin:/usr/sbin:/sbin";
const FFMPEG_CANDIDATOS = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"] as const;

const ERROS_DO_CHROME = {
  encerrou: "Native host has exited.",
  naoIniciou: "Failed to start native messaging host.",
  comunicacao: "Error when communicating with the native messaging host.",
} as const;

// Depois de fechar a porta, o Chrome dá 2 s ao host e então o mata (EnsureProcessTerminated).
const ESPERA_ANTES_DE_MATAR_MS = 2_000;
const PRAZO_DO_GRUPO_MS = 15_000;

export interface OpcoesDoCanalNode {
  /** Modelo gravado no config.toml; ausente, vale o padrão do aplicativo auxiliar. */
  modelo?: string;
  /** Extensão autorizada no config.toml; o padrão é a própria extensão. */
  extensaoAutorizada?: string;
  /** Versão do protocolo que o host passa a falar, como um aplicativo auxiliar de outra versão. */
  protocoloDoHost?: number;
}

let pythonPadrao: string | undefined;

export class CanalNode implements CanalNativo {
  /** Pasta do aplicativo, com o config.toml e os registros do host; apagada em `encerrar`. */
  readonly pasta: string;
  private readonly python: string;
  private readonly argumentos: string[];
  private readonly ambiente: NodeJS.ProcessEnv;
  private readonly portas: PortaDoHost[] = [];

  constructor(opcoes: OpcoesDoCanalNode = {}) {
    this.python = pythonPadrao ??= escolherPython();
    this.pasta = mkdtempSync(join(tmpdir(), "whispper-canal-node-"));
    const temporarios = join(this.pasta, "tmp");
    mkdirSync(temporarios);
    writeFileSync(join(this.pasta, "config.toml"), textoDaConfiguracao(opcoes));
    // O que o lançador instalado exporta, mas com o código do repositório em vez da cópia instalada.
    this.ambiente = {
      HOME: homedir(),
      PATH: PATH_DO_CHROME,
      TMPDIR: temporarios,
      HF_HUB_OFFLINE: "1",
      HF_HUB_DISABLE_TELEMETRY: "1",
      WHISPPER_MOTOR_PASTA: this.pasta,
      PYTHONPATH: AUXILIAR,
      PYTHONSAFEPATH: "1",
    };
    this.argumentos =
      opcoes.protocoloDoHost === undefined
        ? ["-m", "whispper_motor", ORIGEM]
        : ["-c", codigoComProtocolo(opcoes.protocoloDoHost), ORIGEM];
  }

  get hostsLancados(): number {
    return this.portas.length;
  }

  conectar(): PortaNativa {
    // Grupo de processos próprio, para que `encerrar` alcance também o trabalhador do host.
    const processo = spawn(this.python, this.argumentos, {
      cwd: this.pasta,
      env: this.ambiente,
      stdio: ["pipe", "pipe", "inherit"],
      detached: true,
    });
    const porta = new PortaDoHost(processo);
    this.portas.push(porta);
    return porta;
  }

  /** Mata só o host da porta mais recente, como o `pkill -9` da verificação manual (RF-10). */
  derrubarHost(): void {
    this.portas.at(-1)?.processo.kill("SIGKILL");
  }

  /** Fecha as portas abertas e espera o fim dos hosts e dos trabalhadores; depois apaga a pasta. */
  async encerrar(): Promise<void> {
    for (const porta of this.portas) porta.desconectar();
    await Promise.all(this.portas.map((porta) => porta.aguardarFim(PRAZO_DO_GRUPO_MS)));
    rmSync(this.pasta, { recursive: true, force: true });
  }
}

class PortaDoHost implements PortaNativa {
  readonly processo: ChildProcess;
  private fechada = false;
  private recebido = Buffer.alloc(0);
  private readonly ouvintesDeMensagem: Array<(mensagem: unknown) => void> = [];
  private readonly ouvintesDeDesconexao: Array<(erro: string | null) => void> = [];
  private readonly saiu: Promise<void>;

  constructor(processo: ChildProcess) {
    this.processo = processo;
    // Sem executável, o Node emite "error" e depois "close", sem "exit".
    this.saiu = new Promise((resolver) => processo.once("close", () => resolver()));
    processo.on("error", () => this.cair(ERROS_DO_CHROME.naoIniciou));
    processo.on("close", () => this.cair(ERROS_DO_CHROME.encerrou));
    processo.stdout?.on("data", (pedaco: Buffer) => this.ler(pedaco));
    // Escrever num host que já saiu falha com EPIPE; a desconexão chega pelo "close".
    processo.stdin?.on("error", () => {});
  }

  enviar(mensagem: unknown): void {
    if (this.fechada) throw new Error("Attempting to use a disconnected port object");
    const corpo = Buffer.from(JSON.stringify(mensagem), "utf8");
    const cabecalho = Buffer.alloc(4);
    if (endianness() === "LE") cabecalho.writeUInt32LE(corpo.length);
    else cabecalho.writeUInt32BE(corpo.length);
    this.processo.stdin?.write(Buffer.concat([cabecalho, corpo]));
  }

  aoReceber(ouvinte: (mensagem: unknown) => void): void {
    this.ouvintesDeMensagem.push(ouvinte);
  }

  aoDesconectar(ouvinte: (erro: string | null) => void): void {
    this.ouvintesDeDesconexao.push(ouvinte);
  }

  desconectar(): void {
    if (!this.fechada) this.fechar();
  }

  /** Espera o host e os processos do seu grupo saírem; vencido o prazo, mata o grupo inteiro. */
  async aguardarFim(prazoMs: number): Promise<void> {
    await this.saiu;
    const grupo = this.processo.pid;
    if (grupo === undefined) return;
    const limite = Date.now() + prazoMs;
    while (grupoVivo(grupo)) {
      if (Date.now() > limite) matarGrupo(grupo);
      await esperar(100);
    }
  }

  private ler(pedaco: Buffer): void {
    this.recebido = Buffer.concat([this.recebido, pedaco]);
    while (!this.fechada && this.recebido.length >= 4) {
      const tamanho = endianness() === "LE" ? this.recebido.readUInt32LE(0) : this.recebido.readUInt32BE(0);
      if (tamanho > contrato.limites.saidaMaxBytes) {
        this.cair(ERROS_DO_CHROME.comunicacao);
        return;
      }
      if (this.recebido.length < 4 + tamanho) return;
      const corpo = this.recebido.subarray(4, 4 + tamanho);
      this.recebido = this.recebido.subarray(4 + tamanho);
      let mensagem: unknown;
      try {
        mensagem = JSON.parse(corpo.toString("utf8"));
      } catch {
        this.cair(ERROS_DO_CHROME.comunicacao);
        return;
      }
      for (const ouvinte of this.ouvintesDeMensagem) ouvinte(mensagem);
    }
  }

  private cair(erro: string): void {
    if (this.fechada) return;
    this.fechar();
    for (const ouvinte of this.ouvintesDeDesconexao) ouvinte(erro);
  }

  private fechar(): void {
    this.fechada = true;
    this.processo.stdin?.end();
    this.processo.stdout?.destroy();
    setTimeout(() => {
      if (this.processo.exitCode === null && this.processo.signalCode === null) this.processo.kill("SIGKILL");
    }, ESPERA_ANTES_DE_MATAR_MS).unref();
  }
}

/**
 * O interpretador do host, pela regra do motor.sh (DT-07): o de WHISPPER_PYTHON; senão, o primeiro
 * que importa o mlx-whisper entre o da primeira linha do executável mlx_whisper e o python3 do
 * PATH; senão, o primeiro deles, com que o host acusará "mlx-whisper ausente".
 */
export function escolherPython(ambiente: NodeJS.ProcessEnv = process.env): string {
  if (ambiente.WHISPPER_PYTHON) return ambiente.WHISPPER_PYTHON;
  const candidatos = [interpretadorDoMlxWhisper(ambiente.PATH), procurarNoPath("python3", ambiente.PATH)].filter(
    (candidato): candidato is string => candidato !== undefined && executavel(candidato),
  );
  const escolhido = candidatos.find(importaMlxWhisper) ?? candidatos[0];
  if (escolhido === undefined) {
    throw new Error(
      "nenhum Python encontrado; defina WHISPPER_PYTHON com o interpretador em que o mlx-whisper está instalado",
    );
  }
  return escolhido;
}

function interpretadorDoMlxWhisper(path: string | undefined): string | undefined {
  const executavelDoMlx = procurarNoPath("mlx_whisper", path);
  if (executavelDoMlx === undefined) return undefined;
  const [primeira = "", segunda = ""] = readFileSync(executavelDoMlx, "utf8").split("\n", 2);
  // Caminho com espaço ou longo demais: o pip reexecuta o Python na segunda linha.
  if (primeira.startsWith("#!/bin/sh")) return /^'''exec' "([^"]*)"/.exec(segunda)?.[1];
  if (primeira.startsWith("#!/usr/bin/env ")) return procurarNoPath(primeira.slice("#!/usr/bin/env ".length), path);
  if (primeira.startsWith("#!")) return primeira.slice(2).split(" ")[0];
  return undefined;
}

function importaMlxWhisper(python: string): boolean {
  const env = { ...process.env, HF_HUB_OFFLINE: "1" };
  return spawnSync(python, ["-c", "import mlx_whisper"], { stdio: "ignore", env }).status === 0;
}

function procurarNoPath(nome: string, path = ""): string | undefined {
  return path
    .split(":")
    .filter((pasta) => pasta !== "")
    .map((pasta) => join(pasta, nome))
    .find(executavel);
}

function executavel(caminho: string): boolean {
  try {
    accessSync(caminho, constants.X_OK);
    return statSync(caminho).isFile();
  } catch {
    return false;
  }
}

// Os mesmos valores que `motor.sh instalar` grava, detectados no ambiente de quem roda os testes.
function textoDaConfiguracao(opcoes: OpcoesDoCanalNode): string {
  const { HF_HUB_CACHE, HF_HOME, PATH } = process.env;
  const pastaDeModelos = HF_HUB_CACHE || (HF_HOME ? join(HF_HOME, "hub") : join(homedir(), ".cache", "huggingface", "hub"));
  const ffmpeg = procurarNoPath("ffmpeg", PATH) ?? FFMPEG_CANDIDATOS.find(executavel) ?? FFMPEG_CANDIDATOS[0];
  const campos: Array<[string, string]> = [
    ...(opcoes.modelo === undefined ? [] : [["modelo", opcoes.modelo] as [string, string]]),
    ["pasta_de_modelos", pastaDeModelos],
    ["ffmpeg", ffmpeg],
    ["extensao_id", opcoes.extensaoAutorizada ?? ID_DA_EXTENSAO],
  ];
  // Cadeia do JSON é cadeia básica válida em TOML.
  return campos.map(([campo, valor]) => `${campo} = ${JSON.stringify(valor)}\n`).join("");
}

// O host verdadeiro com a constante trocada antes que os módulos do pacote a importem.
function codigoComProtocolo(protocolo: number): string {
  if (!Number.isInteger(protocolo)) throw new TypeError("protocoloDoHost deve ser inteiro");
  return `import runpy, whispper_motor; whispper_motor.PROTOCOLO = ${protocolo}; runpy.run_module("whispper_motor", run_name="__main__")`;
}

function grupoVivo(grupo: number): boolean {
  try {
    process.kill(-grupo, 0);
    return true;
  } catch (erro) {
    return (erro as NodeJS.ErrnoException).code === "EPERM";
  }
}

function matarGrupo(grupo: number): void {
  try {
    process.kill(-grupo, "SIGKILL");
  } catch {
    // O grupo pode ter acabado entre a consulta e o sinal.
  }
}
