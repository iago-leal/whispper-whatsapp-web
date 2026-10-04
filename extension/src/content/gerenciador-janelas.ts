import type { ExibicaoDeTranscricao, EstadoExibicao } from '../dominio/exibicao-de-transcricao.ts';
import type { CoordenadasAncora } from '../dominio/fonte-de-audio.ts';
import { calcularPosicoesJanelas, type AreaDaConversa, type PosicaoCalculada, type SetaCalculada } from './posicionador-colisoes.ts';
import { criarElementoJanela, atualizarConteudoJanela, aplicarDestaqueJanela, liberarContadorJanela } from './janela-elemento.ts';
import { CronometroDeEspera } from './cronometro-espera.ts';

interface RegistroJanela {
  idAudio: string;
  elemento: HTMLElement | null;
  estado: EstadoExibicao;
  direcao: 'recebido' | 'enviado';
  ancora?: CoordenadasAncora;
  seta: SVGGElement | null;
  // Ordem do último abrir ou destacar (BUG-20261004-TTLJ)
  foco: number;
}

const LIMITE_MAXIMO_JANELAS = 20;

const SVG = 'http://www.w3.org/2000/svg';

// Altura suposta da janela que ainda não entrou na página, ou de toda janela sem página, nos testes de
// unidade; na página, vale a altura desenhada (BUG-20261002-K3DY)
const ALTURA_SEM_MEDIDA = 160;

export class GerenciadorDeJanelas implements ExibicaoDeTranscricao {
  private janelas = new Map<string, RegistroJanela>();
  private container: HTMLElement | null = null;
  private ouvintesFechar: Array<(idAudio: string) => void> = [];
  private ouvintesReexecutar: Array<(idAudio: string) => void> = [];
  private ultimoFoco = 0;

  private readonly cronometro: CronometroDeEspera;

  private readonly obterAncora: (idAudio: string) => CoordenadasAncora | null;

  private readonly obterAreaConversa: () => AreaDaConversa | null;

  // A âncora só é notificada na rolagem e no redimensionamento; a abertura a lê de obterAncora, senão
  // a janela nasce oculta até a primeira rolagem (BUG-20261002-IXWO). A área da conversa é lida a cada
  // posicionamento: sem ela, a janela cabe na tela inteira e pode cobrir a lista de conversas
  // (BUG-20261002-A4MZ) ou descer sobre a caixa de escrita (BUG-20261002-HVT4).
  constructor(
    cronometro: CronometroDeEspera = new CronometroDeEspera(),
    obterAncora: (idAudio: string) => CoordenadasAncora | null = () => null,
    obterAreaConversa: () => AreaDaConversa | null = () => null
  ) {
    this.cronometro = cronometro;
    this.obterAncora = obterAncora;
    this.obterAreaConversa = obterAreaConversa;
    this.garantirContainer();
  }

  // As setas ficam numa camada própria, a primeira filha do container: atrás de todas as janelas
  // (BUG-20261002-OW7G)
  private garantirCamadaSetas(): SVGSVGElement | null {
    const container = this.garantirContainer();
    if (!container) return null;
    let camada = container.querySelector<SVGSVGElement>(':scope > svg.whispper-setas');
    if (!camada) {
      camada = document.createElementNS(SVG, 'svg');
      camada.setAttribute('class', 'whispper-setas');
      camada.setAttribute('aria-hidden', 'true');
      container.prepend(camada);
    }
    return camada;
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

    // Lidas antes de a janela entrar na página: depois, a medição do balão ou da área calcularia o
    // estilo da janela ainda sem posição, e a transição do transform a faria deslizar do canto da tela
    const ancoraAtual = ancora ?? this.obterAncora(idAudio) ?? undefined;
    const area = this.obterAreaConversa();

    // O estado inicial "Na fila" vale só até o núcleo informar o estado do pedido, no mesmo clique

    // Limite de até 20 janelas: descarta a mais antiga se exceder
    if (this.janelas.size >= LIMITE_MAXIMO_JANELAS) {
      const primeiraChave = this.janelas.keys().next().value;
      if (primeiraChave) this.fechar(primeiraChave);
    }

    const estadoInicial: EstadoExibicao = { tipo: 'fila', posicaoNaFila: 1, inicioEsperaEm: this.cronometro.agora() };
    let el: HTMLElement | null = null;

    if (typeof document !== 'undefined') {
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
    }

    this.janelas.set(idAudio, {
      idAudio,
      elemento: el,
      estado: estadoInicial,
      direcao,
      ancora: ancoraAtual,
      seta: null,
      foco: ++this.ultimoFoco
    });

    // A janela recebe a posição antes de entrar na página e só depois é medida: medida antes, ainda sem
    // posição, a transição do transform a faria deslizar do canto da tela. Já medida, o segundo cálculo
    // acomoda à altura dela as janelas de baixo (BUG-20261002-K3DY). No pé da conversa, o segundo cálculo
    // move a própria janela, que sobe pela altura medida: ela entra sem transição até o estilo fixar, para
    // não deslizar (BUG-20261002-HVT4).
    el?.classList.add('whispper-janela-entrando');
    this.recalcularPosicoes(area);
    if (el) {
      this.garantirContainer()?.appendChild(el);
      this.recalcularPosicoes(area);
      void getComputedStyle(el).transform;
      el.classList.remove('whispper-janela-entrando');
    }
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

  // O clique no ícone de um áudio com janela aberta chega aqui: no modo abaixo, em que só a janela de foco
  // mais recente fica à vista, ela volta e a anterior se oculta (BUG-20261004-TTLJ)
  destacar(idAudio: string): void {
    const reg = this.janelas.get(idAudio);
    if (!reg) return;
    reg.foco = ++this.ultimoFoco;
    this.recalcularPosicoes();
    if (reg.elemento) {
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
    reg.seta?.remove();
    this.janelas.delete(idAudio);
    // Fechar a janela de foco não põe outra à vista no modo abaixo: as demais ficam sem foco até o próximo
    // destaque (BUG-20261004-TTLJ)
    if (reg.foco === this.ultimoFoco) {
      for (const outra of this.janelas.values()) outra.foco = 0;
    }

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

  recalcularPosicoes(area: AreaDaConversa | null = this.obterAreaConversa()): void {
    // Todas as alturas são lidas antes de qualquer posição ser escrita, numa só medida da página
    const requisicoes = Array.from(this.janelas.values()).map((reg) => ({
      idAudio: reg.idAudio,
      direcao: reg.direcao,
      largura: 320,
      altura: reg.elemento?.isConnected ? reg.elemento.offsetHeight : ALTURA_SEM_MEDIDA,
      ancora: reg.ancora,
      foco: reg.foco
    }));

    const faixaVertical = area?.topo !== undefined && area.fundo !== undefined ? { topo: area.topo, fundo: area.fundo } : undefined;
    const posicoes = calcularPosicoesJanelas(requisicoes, area?.direita, area?.esquerda, faixaVertical);
    for (const pos of posicoes) {
      const reg = this.janelas.get(pos.idAudio);
      if (reg && reg.elemento) {
        if (!pos.visivel) {
          reg.elemento.classList.add('whispper-janela-oculta');
        } else {
          reg.elemento.classList.remove('whispper-janela-oculta');
          reg.elemento.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
        }
        this.desenharSeta(reg, pos);
      }
    }
  }

  // A seta só é desenhada para a janela que já está na página: a da janela nova nasce no lugar, sem a
  // transição do traçado. Some com a janela oculta (BUG-20261002-OW7G).
  private desenharSeta(reg: RegistroJanela, pos: PosicaoCalculada): void {
    if (!pos.visivel || !pos.seta) {
      if (reg.seta) reg.seta.style.display = 'none';
      return;
    }
    if (!reg.elemento?.isConnected) return;

    let grupo = reg.seta;
    const nova = !grupo;
    if (!grupo) {
      grupo = document.createElementNS(SVG, 'g');
      grupo.setAttribute('data-whispper-seta-de', reg.idAudio);
      for (const classe of ['whispper-seta-linha', 'whispper-seta-ponta']) {
        const caminho = document.createElementNS(SVG, 'path');
        caminho.setAttribute('class', classe);
        grupo.appendChild(caminho);
      }
      reg.seta = grupo;
    }
    grupo.style.display = '';
    grupo.querySelector<SVGPathElement>('.whispper-seta-linha')?.style.setProperty('d', `path("${tracadoDaLinha(pos.seta)}")`);
    grupo.querySelector<SVGPathElement>('.whispper-seta-ponta')?.style.setProperty('d', `path("${tracadoDaPonta(pos.seta)}")`);
    if (nova) this.garantirCamadaSetas()?.appendChild(grupo);
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

const px = (v: number) => Math.round(v * 100) / 100;

// Da cauda ao trilho, pelo trilho até a altura da ponta e dali até a ponta, sempre com os mesmos comandos:
// a transição do traçado leva a seta reta ao cotovelo e de volta
function tracadoDaLinha(seta: SetaCalculada): string {
  return `M ${px(seta.caudaX)} ${px(seta.caudaY)} H ${px(seta.trilho)} V ${px(seta.pontaY)} H ${px(seta.pontaX)}`;
}

// Triângulo de 4 px de comprimento e 7 de largura, com o bico na ponta, voltado para o balão
function tracadoDaPonta(seta: SetaCalculada): string {
  const { pontaX: x, pontaY: y } = seta;
  // Os dois cantos da base, do lado da janela
  const cantos: Record<SetaCalculada['direcao'], [number, number, number, number]> = {
    esquerda: [x + 4, y - 3.5, x + 4, y + 3.5],
    direita: [x - 4, y - 3.5, x - 4, y + 3.5],
    acima: [x - 3.5, y + 4, x + 3.5, y + 4],
    abaixo: [x - 3.5, y - 4, x + 3.5, y - 4]
  };
  const [x1, y1, x2, y2] = cantos[seta.direcao];
  return `M ${px(x)} ${px(y)} L ${px(x1)} ${px(y1)} L ${px(x2)} ${px(y2)} Z`;
}
