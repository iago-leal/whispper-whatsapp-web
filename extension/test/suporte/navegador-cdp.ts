// Chrome for Testing dirigido pelo protocolo DevTools, sem dependência: o WebSocket do Node fala com
// a porta de depuração. Serve ao teste ponta a ponta da instalação guiada. O Chrome de marca não
// carrega extensão desempacotada pela linha de comando desde a versão 137; o Chrome for Testing,
// sim, e o Playwright o deixa em ~/Library/Caches/ms-playwright.

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";

type Mensagem = { id?: number; method?: string; params?: any; sessionId?: string; result?: any; error?: { message: string } };

export function localizarNavegador(): string | null {
  if (process.env.WHISPPER_E2E_NAVEGADOR) return process.env.WHISPPER_E2E_NAVEGADOR;
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (!existsSync(cache)) return null;
  const versoes = readdirSync(cache)
    .filter((nome) => /^chromium-\d+$/.test(nome))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const versao of versoes) {
    const app = join(cache, versao, "chrome-mac-arm64", "Google Chrome for Testing.app");
    const executavel = join(app, "Contents", "MacOS", "Google Chrome for Testing");
    if (existsSync(executavel)) return executavel;
  }
  return null;
}

export class Navegador {
  private proximoId = 0;
  private readonly pendentes = new Map<number, { resolver: (r: any) => void; rejeitar: (e: Error) => void }>();
  private readonly ouvintes = new Set<(m: Mensagem) => void>();
  private readonly processo: ChildProcess;
  private readonly ws: WebSocket;

  private constructor(processo: ChildProcess, ws: WebSocket) {
    this.processo = processo;
    this.ws = ws;
    ws.onmessage = (evento) => {
      const mensagem: Mensagem = JSON.parse(String(evento.data));
      if (mensagem.id !== undefined) {
        const pendente = this.pendentes.get(mensagem.id);
        this.pendentes.delete(mensagem.id);
        if (mensagem.error) pendente?.rejeitar(new Error(mensagem.error.message));
        else pendente?.resolver(mensagem.result);
        return;
      }
      for (const ouvinte of this.ouvintes) ouvinte(mensagem);
    };
  }

  static async abrir(executavel: string, perfil: string, extensao: string): Promise<Navegador> {
    const processo = spawn(
      executavel,
      [
        `--user-data-dir=${perfil}`,
        "--remote-debugging-port=0",
        `--load-extension=${extensao}`,
        `--disable-extensions-except=${extensao}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    // Com a porta 0, o navegador escolhe uma e a anota no perfil: porta na 1ª linha, caminho na 2ª.
    const anotacao = join(perfil, "DevToolsActivePort");
    const limite = Date.now() + 30_000;
    let linhas: string[] = [];
    while (linhas.length < 2) {
      if (Date.now() > limite) {
        processo.kill();
        throw new Error("o navegador não abriu a porta de depuração em 30 s");
      }
      await esperar(100);
      if (existsSync(anotacao)) linhas = readFileSync(anotacao, "utf8").trim().split("\n");
    }
    const ws = new WebSocket(`ws://127.0.0.1:${linhas[0]}${linhas[1]}`);
    await new Promise((resolver, rejeitar) => {
      ws.onopen = resolver;
      ws.onerror = () => rejeitar(new Error("falha ao conectar ao protocolo DevTools"));
    });
    return new Navegador(processo, ws);
  }

  enviar(metodo: string, parametros: object = {}, sessao?: string): Promise<any> {
    const id = ++this.proximoId;
    this.ws.send(JSON.stringify({ id, method: metodo, params: parametros, ...(sessao ? { sessionId: sessao } : {}) }));
    return new Promise((resolver, rejeitar) => this.pendentes.set(id, { resolver, rejeitar }));
  }

  ouvir(ouvinte: (m: Mensagem) => void): () => void {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  }

  async abrirPagina(url: string): Promise<Pagina> {
    const { targetId } = await this.enviar("Target.createTarget", { url });
    const { sessionId } = await this.enviar("Target.attachToTarget", { targetId, flatten: true });
    const pagina = new Pagina(this, sessionId);
    // Um alert() trava a página: cada diálogo é anotado e fechado, para o teste falhar com o texto dele.
    this.ouvir((m) => {
      if (m.sessionId === sessionId && m.method === "Page.javascriptDialogOpening") {
        pagina.dialogos.push(m.params.message);
        void this.enviar("Page.handleJavaScriptDialog", { accept: true }, sessionId);
      }
    });
    await this.enviar("Page.enable", {}, sessionId);
    return pagina;
  }

  async fechar(): Promise<void> {
    await Promise.race([this.enviar("Browser.close").catch(() => undefined), esperar(5_000)]);
    this.ws.close();
    this.processo.kill();
  }
}

export class Pagina {
  readonly dialogos: string[] = [];
  private readonly navegador: Navegador;
  private readonly sessao: string;

  constructor(navegador: Navegador, sessao: string) {
    this.navegador = navegador;
    this.sessao = sessao;
  }

  async avaliar<T>(expressao: string, gestoDoUsuario = false): Promise<T> {
    const { result, exceptionDetails } = await this.navegador.enviar(
      "Runtime.evaluate",
      { expression: expressao, returnByValue: true, awaitPromise: true, userGesture: gestoDoUsuario },
      this.sessao,
    );
    if (exceptionDetails) throw new Error(`${expressao}: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value as T;
  }

  clicar(id: string): Promise<void> {
    return this.avaliar(`document.getElementById(${JSON.stringify(id)}).click()`, true);
  }

  async aguardar(expressao: string, prazoMs: number, oQue: string): Promise<void> {
    const limite = Date.now() + prazoMs;
    while (!(await this.avaliar<boolean>(expressao).catch(() => false))) {
      if (this.dialogos.length) throw new Error(`a página abriu um diálogo esperando ${oQue}: ${this.dialogos.join(" | ")}`);
      if (Date.now() > limite) throw new Error(`${prazoMs / 1000} s esperando ${oQue}`);
      await esperar(250);
    }
  }
}
