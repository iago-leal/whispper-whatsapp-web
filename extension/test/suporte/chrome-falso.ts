// Imitação mínima de chrome.runtime, para testar no Node o código que toca o navegador.
// Como no Chrome, lastError só vale durante o callback de onDisconnect, e postMessage lança
// depois que a porta fecha.

class EventoFalso<A extends unknown[]> {
  private readonly ouvintes: Array<(...args: A) => void> = [];

  addListener(ouvinte: (...args: A) => void): void {
    this.ouvintes.push(ouvinte);
  }

  disparar(...args: A): void {
    for (const ouvinte of this.ouvintes) ouvinte(...args);
  }
}

export class PortaDoChromeFalsa {
  readonly nome: string;
  readonly enviadas: unknown[] = [];
  readonly onMessage = new EventoFalso<[mensagem: unknown, porta: PortaDoChromeFalsa]>();
  readonly onDisconnect = new EventoFalso<[porta: PortaDoChromeFalsa]>();
  desconectadaPelaExtensao = false;
  private fechada = false;
  private readonly runtime: RuntimeFalso;

  constructor(nome: string, runtime: RuntimeFalso) {
    this.nome = nome;
    this.runtime = runtime;
  }

  postMessage(mensagem: unknown): void {
    if (this.fechada) throw new Error("Attempting to use a disconnected port object");
    this.enviadas.push(mensagem);
    this.runtime.aoEnviar?.(this, mensagem);
  }

  disconnect(): void {
    this.fechada = true;
    this.desconectadaPelaExtensao = true;
  }

  responder(mensagem: unknown): void {
    if (!this.fechada) this.onMessage.disparar(mensagem, this);
  }

  cair(erro: string | null): void {
    if (this.fechada) return;
    this.fechada = true;
    this.runtime.lastError = erro === null ? undefined : { message: erro };
    try {
      this.onDisconnect.disparar(this);
    } finally {
      this.runtime.lastError = undefined;
    }
  }
}

export class RuntimeFalso {
  readonly id = "extensaofalsa";
  lastError: { message: string } | undefined = undefined;
  readonly portas: PortaDoChromeFalsa[] = [];
  aoConectar?: (porta: PortaDoChromeFalsa) => void;
  aoEnviar?: (porta: PortaDoChromeFalsa, mensagem: unknown) => void;

  connectNative(nome: string): PortaDoChromeFalsa {
    const porta = new PortaDoChromeFalsa(nome, this);
    this.portas.push(porta);
    this.aoConectar?.(porta);
    return porta;
  }

  getURL(caminho: string): string {
    return `chrome-extension://${this.id}/${caminho}`;
  }

  get ultima(): PortaDoChromeFalsa {
    const porta = this.portas.at(-1);
    if (!porta) throw new Error("nenhuma porta aberta");
    return porta;
  }
}

/** Instala em globalThis um `chrome.runtime` novo e o devolve. */
export function instalarChromeFalso(): RuntimeFalso {
  const runtime = new RuntimeFalso();
  Object.assign(globalThis, { chrome: { runtime } });
  return runtime;
}
