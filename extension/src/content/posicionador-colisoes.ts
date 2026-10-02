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

// Bordas verticais, em px da tela, da parte visível da lista de mensagens: o fim do cabeçalho da conversa e
// o começo da caixa de escrita (BUG-20261002-HVT4)
export interface FaixaVertical {
  topo: number;
  fundo: number;
}

// A área da conversa como o adaptador a mede; sem as bordas verticais, a altura da janela não tem limite
export type AreaDaConversa = FaixaHorizontal & Partial<FaixaVertical>;

// Seta que liga a janela ao balão de origem (RF-05; BUG-20261002-OW7G), em px da tela. A direção é para onde
// ela aponta, da janela ao balão. O traçado sai da cauda, na borda da janela, corre até o trilho, segue nele
// até a altura da ponta e entra no balão: reta quando a cauda e a ponta estão à mesma altura, em cotovelo no
// corredor entre os dois quando não. No modo abaixo (RF-02), a seta é vertical, e o trilho fica sobre ela.
export interface SetaCalculada {
  direcao: 'esquerda' | 'direita' | 'acima' | 'abaixo';
  pontaX: number;
  pontaY: number;
  caudaX: number;
  caudaY: number;
  trilho: number;
}

export interface PosicaoCalculada {
  idAudio: string;
  x: number;
  y: number;
  visivel: boolean;
  deslocadaPorColisao: boolean;
  seta: SetaCalculada | null;
}

const GAP = 8;
// Distância da cauda aos cantos arredondados da janela
const MARGEM_DA_CAUDA = 10;
// Comprimento da ponta da seta e folga do trilho até a borda da janela
const COMPRIMENTO_DA_PONTA = 4;
const FOLGA_DO_TRILHO = 1;

// Janela já posta, com a posição ainda sem arredondar
interface Posta {
  resultado: PosicaoCalculada;
  ancora: CoordenadasAncora;
  lateral: boolean;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

const cruzamNaHorizontal = (a: Posta, b: Posta) => a.x < b.x + b.largura && b.x < a.x + a.largura;

/**
 * Calcula as coordenadas de tela para cada janela aberta, resolvendo colisões verticais.
 * O espaço livre ao lado do balão é medido entre as bordas da área da conversa (RF-01 da janela); sem
 * elas, vale a tela inteira. Com a faixa vertical das mensagens, a janela cabe entre o cabeçalho e a caixa
 * de escrita, e a do balão fora dela se oculta (BUG-20261002-HVT4).
 */
export function calcularPosicoesJanelas(
  requisicoes: RequisicaoPosicionamento[],
  direitaDaArea: number = typeof window !== 'undefined' ? window.innerWidth : 1200,
  esquerdaDaArea: number = 0,
  faixaVertical?: FaixaVertical
): PosicaoCalculada[] {
  // Ordena verticalmente pela posição do balão no documento
  const ordenadas = [...requisicoes].sort((a, b) => {
    const yA = a.ancora?.y ?? 0;
    const yB = b.ancora?.y ?? 0;
    return yA - yB;
  });

  const resultados: PosicaoCalculada[] = [];
  const postas: Posta[] = [];

  for (const req of ordenadas) {
    // Balão sob o cabeçalho ou sob a caixa de escrita está na tela, mas fora da área das mensagens (RF-03)
    const foraDaFaixa = !!req.ancora && !!faixaVertical &&
      (req.ancora.y + req.ancora.altura <= faixaVertical.topo || req.ancora.y >= faixaVertical.fundo);
    if (!req.ancora || !req.ancora.visivel || foraDaFaixa) {
      resultados.push({
        idAudio: req.idAudio,
        x: 0,
        y: 0,
        visivel: false,
        deslocadaPorColisao: false,
        seta: null
      });
      continue;
    }

    const { ancora, direcao, largura, altura } = req;
    let x: number;
    let y = ancora.y;
    let lateral = true;

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
      lateral = false;
      // No pé da conversa, acima do balão, se ali couber: subir para caber o cobriria
      if (faixaVertical && y + altura > faixaVertical.fundo - GAP && ancora.y - GAP - altura >= faixaVertical.topo) {
        y = ancora.y - GAP - altura;
      }
    }

    let deslocada = false;
    // Resolução de colisão vertical contra as janelas postas que cruzam a faixa horizontal desta; a de um
    // áudio do outro lado da conversa, que não a alcança, não a empurra (BUG-20261002-K3DY)
    const fimDasQueCruzam = postas
      .filter((posta) => posta.x < x + largura && x < posta.x + posta.largura)
      .reduce((fim, posta) => Math.max(fim, posta.y + posta.altura + GAP), -Infinity);
    if (y < fimDasQueCruzam) {
      y = fimDasQueCruzam;
      deslocada = true;
    }

    const resultado: PosicaoCalculada = {
      idAudio: req.idAudio,
      x: Math.round(x),
      y: 0,
      visivel: true,
      deslocadaPorColisao: deslocada,
      seta: null
    };
    postas.push({ resultado, ancora, lateral, x, y, largura, altura });
    resultados.push(resultado);
  }

  if (faixaVertical) conterNaFaixa(postas, faixaVertical);
  for (const posta of postas) {
    posta.resultado.y = Math.round(posta.y);
    posta.resultado.seta = calcularSeta(posta, faixaVertical);
  }
  distribuirTrilhos(postas.map((posta) => posta.resultado.seta!));

  return resultados;
}

/**
 * A seta da janela já na posição final: a ponta na borda do balão voltada para a janela, à altura do centro
 * da parte visível dele (ou, no modo abaixo, no meio do trecho que o balão e a janela têm em comum); a cauda
 * na borda da janela, o mais perto possível da altura da ponta, a 10 px dos cantos (BUG-20261002-OW7G).
 */
function calcularSeta(posta: Posta, faixa?: FaixaVertical): SetaCalculada {
  const { ancora, resultado } = posta;
  const { x, y } = resultado;
  const topoDoBalao = faixa ? Math.max(ancora.y, faixa.topo) : ancora.y;
  const fundoDoBalao = faixa ? Math.min(ancora.y + ancora.altura, faixa.fundo) : ancora.y + ancora.altura;

  if (!posta.lateral) {
    const meio = (Math.max(x, ancora.x) + Math.min(x + posta.largura, ancora.x + ancora.largura)) / 2;
    const abaixoDoBalao = y + posta.altura / 2 > (topoDoBalao + fundoDoBalao) / 2;
    return abaixoDoBalao
      ? { direcao: 'acima', pontaX: meio, pontaY: fundoDoBalao, caudaX: meio, caudaY: y, trilho: meio }
      : { direcao: 'abaixo', pontaX: meio, pontaY: topoDoBalao, caudaX: meio, caudaY: y + posta.altura, trilho: meio };
  }

  const aDireitaDoBalao = x >= ancora.x + ancora.largura;
  const pontaX = aDireitaDoBalao ? ancora.x + ancora.largura : ancora.x;
  const caudaX = aDireitaDoBalao ? x : x + posta.largura;
  const pontaY = (topoDoBalao + fundoDoBalao) / 2;
  const caudaY = Math.min(Math.max(pontaY, y + MARGEM_DA_CAUDA), Math.max(y + MARGEM_DA_CAUDA, y + posta.altura - MARGEM_DA_CAUDA));
  return {
    direcao: aDireitaDoBalao ? 'esquerda' : 'direita',
    pontaX,
    pontaY,
    caudaX,
    caudaY,
    trilho: (pontaX + caudaX) / 2
  };
}

/**
 * Cotovelos do mesmo corredor cujos trechos verticais se sobrepõem correm em trilhos distintos, ordenados
 * para que nenhum trecho horizontal de um cruze o vertical de outro: a seta cuja ponta cai na altura de outra
 * fica mais perto do balão; a cuja cauda cai, mais perto da janela. Os trilhos se distribuem entre o fim da
 * ponta e a borda da janela; sem sobreposição no corredor, e na seta reta, o trilho fica no meio dele
 * (BUG-20261002-OW7G).
 */
function distribuirTrilhos(setas: SetaCalculada[]): void {
  const corredores = new Map<string, SetaCalculada[]>();
  for (const seta of setas) {
    if (seta.direcao !== 'esquerda' && seta.direcao !== 'direita') continue;
    const chave = `${seta.direcao} ${seta.pontaX} ${seta.caudaX}`;
    corredores.set(chave, [...(corredores.get(chave) ?? []), seta]);
  }

  const dentro = (v: number, seta: SetaCalculada) => v > Math.min(seta.caudaY, seta.pontaY) && v < Math.max(seta.caudaY, seta.pontaY);
  // a vai mais perto do balão que b
  const antes = (a: SetaCalculada, b: SetaCalculada) => dentro(a.pontaY, b) || dentro(b.caudaY, a);

  for (const corredor of corredores.values()) {
    const cotovelos = corredor.filter((seta) => seta.caudaY !== seta.pontaY);
    // Nível de cada cotovelo, a partir do balão: o maior caminho de restrições que chega até ele
    const nivel = new Map(cotovelos.map((seta) => [seta, 0]));
    for (let rodada = 0; rodada < cotovelos.length; rodada++) {
      for (const a of cotovelos) {
        for (const b of cotovelos) {
          if (a !== b && antes(a, b)) nivel.set(b, Math.max(nivel.get(b)!, nivel.get(a)! + 1));
        }
      }
    }
    const niveis = Math.max(0, ...nivel.values()) + 1;
    for (const seta of corredor) {
      const inicio = COMPRIMENTO_DA_PONTA + 0.5;
      const vao = Math.abs(seta.caudaX - seta.pontaX) - FOLGA_DO_TRILHO - inicio;
      const k = nivel.get(seta);
      const deslocamento = k === undefined || niveis === 1 ? inicio + vao / 2 : inicio + (k * vao) / (niveis - 1);
      seta.trilho = seta.pontaX + Math.sign(seta.caudaX - seta.pontaX) * deslocamento;
    }
  }
}

/**
 * A pilha que passaria do fundo da área sobe até terminar 8 px acima dele, cada janela 8 px acima das de
 * baixo que a cruzam; depois, nenhuma fica acima do topo nem sobre as de cima. Só a pilha mais alta que a
 * área volta a passar do fundo (BUG-20261002-HVT4).
 */
function conterNaFaixa(postas: Posta[], { topo, fundo }: FaixaVertical): void {
  for (let i = postas.length - 1; i >= 0; i--) {
    const posta = postas[i]!;
    const limite = postas.slice(i + 1)
      .filter((abaixo) => cruzamNaHorizontal(posta, abaixo))
      .reduce((menor, abaixo) => Math.min(menor, abaixo.y - GAP), fundo - GAP);
    if (posta.y + posta.altura > limite) posta.y = limite - posta.altura;
  }
  for (let i = 0; i < postas.length; i++) {
    const posta = postas[i]!;
    const piso = postas.slice(0, i)
      .filter((acima) => cruzamNaHorizontal(posta, acima))
      .reduce((maior, acima) => Math.max(maior, acima.y + acima.altura + GAP), topo);
    if (posta.y < piso) posta.y = piso;
  }
}
