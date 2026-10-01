import { formatarDecorrido } from '../dominio/tempo-de-espera.ts';

/**
 * Nó de texto que o cronômetro atualiza: o contador ao lado do ícone ou o da janela flutuante.
 */
export interface NoDeTexto {
  textContent: string | null;
  readonly isConnected: boolean;
}

export interface AgendadorCronometro {
  agora(): number;
  repetir(acao: () => void, ms: number): unknown;
  parar(id: unknown): void;
}

interface AlvoDeVisibilidade {
  addEventListener(tipo: 'visibilitychange', ouvinte: () => void): void;
}

const INTERVALO_MS = 500;

const agendadorPadrao: AgendadorCronometro = {
  agora: () => performance.now(),
  repetir: (acao, ms) => setInterval(acao, ms),
  parar: (id) => clearInterval(id as ReturnType<typeof setInterval>)
};

/**
 * Cronômetro único dos contadores de espera do script de conteúdo (feature 006).
 *
 * Um só temporizador serve todos os nós registrados e para quando não há nenhum. O texto é calculado
 * do instante do clique, e não da soma de tiques, porque o navegador espaça os temporizadores de abas
 * ocultas; ao voltar a aba, um tique imediato corrige o valor exibido.
 */
export class CronometroDeEspera {
  private nos = new Map<NoDeTexto, number>();
  private temporizador: unknown = null;

  private readonly agendador: AgendadorCronometro;

  constructor(
    agendador: AgendadorCronometro = agendadorPadrao,
    alvoDeVisibilidade: AlvoDeVisibilidade | null = typeof document !== 'undefined' ? document : null
  ) {
    this.agendador = agendador;
    if (typeof alvoDeVisibilidade?.addEventListener === 'function') {
      alvoDeVisibilidade.addEventListener('visibilitychange', () => this.tique());
    }
  }

  /**
   * Passa a contar o tempo no nó a partir do instante do clique, no relógio do agendador.
   */
  registrar(no: NoDeTexto, inicioEsperaEm: number): void {
    this.nos.set(no, inicioEsperaEm);
    this.escrever(no, inicioEsperaEm, this.agendador.agora());
    if (this.temporizador === null) {
      this.temporizador = this.agendador.repetir(() => this.tique(), INTERVALO_MS);
    }
  }

  remover(no: NoDeTexto): void {
    this.nos.delete(no);
    this.pararSeOcioso();
  }

  /**
   * Instante atual no relógio do cronômetro, o mesmo dos instantes de espera.
   */
  agora(): number {
    return this.agendador.agora();
  }

  get quantidade(): number {
    return this.nos.size;
  }

  tique(): void {
    const agora = this.agendador.agora();
    for (const [no, inicio] of this.nos) {
      if (!no.isConnected) {
        this.nos.delete(no);
        continue;
      }
      this.escrever(no, inicio, agora);
    }
    this.pararSeOcioso();
  }

  private escrever(no: NoDeTexto, inicio: number, agora: number): void {
    const texto = formatarDecorrido(agora - inicio);
    if (no.textContent !== texto) no.textContent = texto;
  }

  private pararSeOcioso(): void {
    if (this.nos.size === 0 && this.temporizador !== null) {
      this.agendador.parar(this.temporizador);
      this.temporizador = null;
    }
  }
}
