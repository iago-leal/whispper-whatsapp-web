import type { ExibicaoDeTranscricao, EstadoExibicao } from '../dominio/exibicao-de-transcricao.ts';
import type { CoordenadasAncora } from '../dominio/fonte-de-audio.ts';
import { calcularPosicoesJanelas } from './posicionador-colisoes.ts';
import { criarElementoJanela, atualizarConteudoJanela, aplicarDestaqueJanela, liberarContadorJanela } from './janela-elemento.ts';
import { CronometroDeEspera } from './cronometro-espera.ts';

interface RegistroJanela {
  idAudio: string;
  elemento: HTMLElement | null;
  estado: EstadoExibicao;
  direcao: 'recebido' | 'enviado';
  ancora?: CoordenadasAncora;
}

const LIMITE_MAXIMO_JANELAS = 20;

export class GerenciadorDeJanelas implements ExibicaoDeTranscricao {
  private janelas = new Map<string, RegistroJanela>();
  private container: HTMLElement | null = null;
  private ouvintesFechar: Array<(idAudio: string) => void> = [];
  private ouvintesReexecutar: Array<(idAudio: string) => void> = [];

  private readonly cronometro: CronometroDeEspera;

  private readonly obterAncora: (idAudio: string) => CoordenadasAncora | null;

  // A âncora só é notificada na rolagem e no redimensionamento; a abertura a lê de obterAncora, senão
  // a janela nasce oculta até a primeira rolagem (BUG-20261002-IXWO).
  constructor(
    cronometro: CronometroDeEspera = new CronometroDeEspera(),
    obterAncora: (idAudio: string) => CoordenadasAncora | null = () => null
  ) {
    this.cronometro = cronometro;
    this.obterAncora = obterAncora;
    this.garantirContainer();
  }

  private garantirContainer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    if (!this.container) {
      let el = document.getElementById('whispper-janelas-container');
      if (!el) {
        el = document.createElement('div');
        el.id = 'whispper-janelas-container';
        document.body?.appendChild(el);
      }
      this.container = el;
    }
    return this.container;
  }

  abrir(idAudio: string, direcao: 'recebido' | 'enviado' = 'recebido', ancora?: CoordenadasAncora): void {
    if (this.janelas.has(idAudio)) {
      this.destacar(idAudio);
      return;
    }

    // Lida antes de a janela entrar na página: depois, a medição do balão calcularia o estilo da
    // janela ainda sem posição, e a transição do transform a faria deslizar do canto da tela
    const ancoraAtual = ancora ?? this.obterAncora(idAudio) ?? undefined;

    // O estado inicial "Na fila" vale só até o núcleo informar o estado do pedido, no mesmo clique

    // Limite de até 20 janelas: descarta a mais antiga se exceder
    if (this.janelas.size >= LIMITE_MAXIMO_JANELAS) {
      const primeiraChave = this.janelas.keys().next().value;
      if (primeiraChave) this.fechar(primeiraChave);
    }

    const estadoInicial: EstadoExibicao = { tipo: 'fila', posicaoNaFila: 1, inicioEsperaEm: this.cronometro.agora() };
    let el: HTMLElement | null = null;

    if (typeof document !== 'undefined') {
      const container = this.garantirContainer();
      el = criarElementoJanela(idAudio, {
        aoFechar: (id) => this.fechar(id),
        aoReexecutar: (id) => {
          for (const cb of this.ouvintesReexecutar) cb(id);
        }
      });
      atualizarConteudoJanela(el, idAudio, estadoInicial, {
        aoFechar: (id) => this.fechar(id),
        aoReexecutar: (id) => {
          for (const cb of this.ouvintesReexecutar) cb(id);
        }
      }, this.cronometro);
      container?.appendChild(el);
    }

    this.janelas.set(idAudio, {
      idAudio,
      elemento: el,
      estado: estadoInicial,
      direcao,
      ancora: ancoraAtual
    });

    this.recalcularPosicoes();
  }

  definirEstado(idAudio: string, estado: EstadoExibicao): void {
    const reg = this.janelas.get(idAudio);
    if (!reg) return;

    reg.estado = estado;
    if (reg.elemento) {
      atualizarConteudoJanela(reg.elemento, idAudio, estado, {
        aoFechar: (id) => this.fechar(id),
        aoReexecutar: (id) => {
          for (const cb of this.ouvintesReexecutar) cb(id);
        }
      }, this.cronometro);
    }
    this.recalcularPosicoes();
  }

  atualizarAncora(ancora: CoordenadasAncora): void {
    const reg = this.janelas.get(ancora.idAudio);
    if (reg) {
      reg.ancora = ancora;
      this.recalcularPosicoes();
    }
  }

  destacar(idAudio: string): void {
    const reg = this.janelas.get(idAudio);
    if (reg && reg.elemento) {
      aplicarDestaqueJanela(reg.elemento);
    }
  }

  fechar(idAudio: string): void {
    const reg = this.janelas.get(idAudio);
    if (!reg) return;

    if (reg.elemento) liberarContadorJanela(reg.elemento, this.cronometro);
    if (reg.elemento && reg.elemento.parentNode) {
      reg.elemento.parentNode.removeChild(reg.elemento);
    }
    this.janelas.delete(idAudio);

    for (const ouvinte of this.ouvintesFechar) {
      ouvinte(idAudio);
    }

    this.recalcularPosicoes();
  }

  aoFechar(callback: (idAudio: string) => void): () => void {
    this.ouvintesFechar.push(callback);
    return () => {
      this.ouvintesFechar = this.ouvintesFechar.filter((cb) => cb !== callback);
    };
  }

  aoReexecutar(callback: (idAudio: string) => void): () => void {
    this.ouvintesReexecutar.push(callback);
    return () => {
      this.ouvintesReexecutar = this.ouvintesReexecutar.filter((cb) => cb !== callback);
    };
  }

  recalcularPosicoes(): void {
    const requisicoes = Array.from(this.janelas.values()).map((reg) => ({
      idAudio: reg.idAudio,
      direcao: reg.direcao,
      largura: 320,
      altura: 160,
      ancora: reg.ancora
    }));

    const posicoes = calcularPosicoesJanelas(requisicoes);
    for (const pos of posicoes) {
      const reg = this.janelas.get(pos.idAudio);
      if (reg && reg.elemento) {
        if (!pos.visivel) {
          reg.elemento.classList.add('whispper-janela-oculta');
        } else {
          reg.elemento.classList.remove('whispper-janela-oculta');
          reg.elemento.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        }
      }
    }
  }

  temJanelaAberta(idAudio: string): boolean {
    return this.janelas.has(idAudio);
  }

  obterEstado(idAudio: string): EstadoExibicao | undefined {
    return this.janelas.get(idAudio)?.estado;
  }

  totalAbertas(): number {
    return this.janelas.size;
  }
}
