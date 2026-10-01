import type { CoordenadasAncora } from '../dominio/fonte-de-audio.ts';

/**
 * Calcula o retângulo e o estado de visibilidade de um elemento balão no viewport.
 */
export function calcularCoordenadasAncora(
  idAudio: string,
  elemento: HTMLElement
): CoordenadasAncora {
  if (elemento.isConnected === false) {
    return {
      idAudio,
      x: 0,
      y: 0,
      largura: 0,
      altura: 0,
      visivel: false
    };
  }

  const rect = elemento.getBoundingClientRect ? elemento.getBoundingClientRect() : {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0
  };

  const alturaViewport = (typeof window !== 'undefined' && window.innerHeight) ||
    (typeof document !== 'undefined' && document.documentElement?.clientHeight) ||
    1000;

  const visivel = (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom >= 0 &&
    rect.top <= alturaViewport
  );

  return {
    idAudio,
    x: rect.left,
    y: rect.top,
    largura: rect.width,
    altura: rect.height,
    visivel
  };
}

/**
 * Cria um gerenciador de rastreamento de âncoras para mensagens abertas.
 */
export class RastreadorDeAncoras {
  private elementos = new Map<string, HTMLElement>();
  private ouvintes: Array<(ancora: CoordenadasAncora) => void> = [];
  private handlerScroll: () => void;

  constructor() {
    this.handlerScroll = () => this.notificarTodas();
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.handlerScroll, true);
      window.addEventListener('resize', this.handlerScroll);
    }
  }

  registrar(idAudio: string, elemento: HTMLElement): void {
    this.elementos.set(idAudio, elemento);
    this.notificar(idAudio);
  }

  remover(idAudio: string): void {
    this.elementos.delete(idAudio);
  }

  aoMudarAncora(ouvinte: (ancora: CoordenadasAncora) => void): () => void {
    this.ouvintes.push(ouvinte);
    return () => {
      this.ouvintes = this.ouvintes.filter((o) => o !== ouvinte);
    };
  }

  obterAncora(idAudio: string): CoordenadasAncora | null {
    const el = this.elementos.get(idAudio);
    if (!el) return null;
    return calcularCoordenadasAncora(idAudio, el);
  }

  destruir(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.handlerScroll, true);
      window.removeEventListener('resize', this.handlerScroll);
    }
    this.elementos.clear();
    this.ouvintes = [];
  }

  private notificar(idAudio: string): void {
    const ancora = this.obterAncora(idAudio);
    if (ancora) {
      for (const ouvinte of this.ouvintes) {
        ouvinte(ancora);
      }
    }
  }

  private notificarTodas(): void {
    for (const idAudio of this.elementos.keys()) {
      this.notificar(idAudio);
    }
  }
}
