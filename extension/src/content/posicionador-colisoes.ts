import type { CoordenadasAncora } from '../dominio/fonte-de-audio.ts';

export interface RequisicaoPosicionamento {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
  largura: number;
  altura: number;
  ancora?: CoordenadasAncora;
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
 */
export function calcularPosicoesJanelas(
  requisicoes: RequisicaoPosicionamento[],
  larguraViewport: number = typeof window !== 'undefined' ? window.innerWidth : 1200
): PosicaoCalculada[] {
  // Ordena verticalmente pela posição do balão no documento
  const ordenadas = [...requisicoes].sort((a, b) => {
    const yA = a.ancora?.y ?? 0;
    const yB = b.ancora?.y ?? 0;
    return yA - yB;
  });

  const resultados: PosicaoCalculada[] = [];
  let ultimoFimY = -Infinity;

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
    const espacoDireita = larguraViewport - (ancora.x + ancora.largura + GAP);
    const espacoEsquerda = ancora.x - GAP;

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
      x = Math.max(GAP, Math.min(ancora.x, larguraViewport - largura - GAP));
      y = ancora.y + ancora.altura + GAP;
    }

    let deslocada = false;
    // Resolução de colisão vertical contra a janela imediatamente acima
    if (y < ultimoFimY) {
      y = ultimoFimY;
      deslocada = true;
    }

    ultimoFimY = y + altura + GAP;

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
