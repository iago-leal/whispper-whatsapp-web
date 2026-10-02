import type { CoordenadasAncora } from '../dominio/fonte-de-audio.ts';

export interface RequisicaoPosicionamento {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
  largura: number;
  altura: number;
  ancora?: CoordenadasAncora;
}

// Bordas horizontais, em px da tela, da área em que a janela deve caber
export interface FaixaHorizontal {
  esquerda: number;
  direita: number;
}

export interface PosicaoCalculada {
  idAudio: string;
  x: number;
  y: number;
  visivel: boolean;
  deslocadaPorColisao: boolean;
}

const GAP = 8;

/**
 * Calcula as coordenadas de tela para cada janela aberta, resolvendo colisões verticais.
 * O espaço livre ao lado do balão é medido entre as bordas da área da conversa (RF-01 da janela); sem
 * elas, vale a tela inteira.
 */
export function calcularPosicoesJanelas(
  requisicoes: RequisicaoPosicionamento[],
  direitaDaArea: number = typeof window !== 'undefined' ? window.innerWidth : 1200,
  esquerdaDaArea: number = 0
): PosicaoCalculada[] {
  // Ordena verticalmente pela posição do balão no documento
  const ordenadas = [...requisicoes].sort((a, b) => {
    const yA = a.ancora?.y ?? 0;
    const yB = b.ancora?.y ?? 0;
    return yA - yB;
  });

  const resultados: PosicaoCalculada[] = [];
  // Faixa horizontal e fim, já com o espaçamento, de cada janela posta
  const postas: Array<{ x: number; largura: number; fimY: number }> = [];

  for (const req of ordenadas) {
    if (!req.ancora || !req.ancora.visivel) {
      resultados.push({
        idAudio: req.idAudio,
        x: 0,
        y: 0,
        visivel: false,
        deslocadaPorColisao: false
      });
      continue;
    }

    const { ancora, direcao, largura, altura } = req;
    let x: number;
    let y = ancora.y;

    // Avalia espaço disponível nas laterais
    const espacoDireita = direitaDaArea - (ancora.x + ancora.largura + GAP);
    const espacoEsquerda = ancora.x - GAP - esquerdaDaArea;

    if (direcao === 'recebido' && espacoDireita >= largura) {
      x = ancora.x + ancora.largura + GAP;
    } else if (direcao === 'enviado' && espacoEsquerda >= largura) {
      x = ancora.x - largura - GAP;
    } else if (espacoDireita >= largura) {
      x = ancora.x + ancora.largura + GAP;
    } else if (espacoEsquerda >= largura) {
      x = ancora.x - largura - GAP;
    } else {
      // Fallback: abaixo do balão sem sobrepor
      x = Math.max(esquerdaDaArea + GAP, Math.min(ancora.x, direitaDaArea - largura - GAP));
      y = ancora.y + ancora.altura + GAP;
    }

    let deslocada = false;
    // Resolução de colisão vertical contra as janelas postas que cruzam a faixa horizontal desta; a de um
    // áudio do outro lado da conversa, que não a alcança, não a empurra (BUG-20261002-K3DY)
    const fimDasQueCruzam = postas
      .filter((posta) => posta.x < x + largura && x < posta.x + posta.largura)
      .reduce((fim, posta) => Math.max(fim, posta.fimY), -Infinity);
    if (y < fimDasQueCruzam) {
      y = fimDasQueCruzam;
      deslocada = true;
    }

    postas.push({ x, largura, fimY: y + altura + GAP });

    resultados.push({
      idAudio: req.idAudio,
      x: Math.round(x),
      y: Math.round(y),
      visivel: true,
      deslocadaPorColisao: deslocada
    });
  }

  return resultados;
}
