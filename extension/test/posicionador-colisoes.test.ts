import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularPosicoesJanelas } from '../src/content/posicionador-colisoes.ts';
import type { RequisicaoPosicionamento } from '../src/content/posicionador-colisoes.ts';

test('calcularPosicoesJanelas posiciona janela ao lado da âncora em espaço suficiente', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-1',
      direcao: 'recebido',
      largura: 320,
      altura: 120,
      ancora: { idAudio: 'audio-1', x: 50, y: 100, largura: 200, altura: 60, visivel: true }
    }
  ];

  const posicoes = calcularPosicoesJanelas(reqs, 1200);
  assert.equal(posicoes.length, 1);
  assert.equal(posicoes[0]?.idAudio, 'audio-1');
  assert.equal(posicoes[0]?.visivel, true);
  // À direita do balão recebido: 50 + 200 + 8 = 258
  assert.equal(posicoes[0]?.x, 258);
  assert.equal(posicoes[0]?.y, 100);
});

test('calcularPosicoesJanelas desloca verticalmente janela para resolver colisão', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-1',
      direcao: 'recebido',
      largura: 320,
      altura: 100,
      ancora: { idAudio: 'audio-1', x: 50, y: 100, largura: 200, altura: 60, visivel: true }
    },
    {
      idAudio: 'audio-2',
      direcao: 'recebido',
      largura: 320,
      altura: 100,
      ancora: { idAudio: 'audio-2', x: 50, y: 140, largura: 200, altura: 60, visivel: true }
    }
  ];

  const posicoes = calcularPosicoesJanelas(reqs, 1200);
  assert.equal(posicoes.length, 2);
  // Primeira janela: y = 100
  assert.equal(posicoes[0]?.y, 100);
  // Segunda janela colidiria (140 < 100 + 100 = 200); deve ser deslocada para 100 + 100 + 8 = 208
  assert.equal(posicoes[1]?.y, 208);
});

test('calcularPosicoesJanelas usa fallback abaixo do balão quando espaço lateral for insuficiente', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-estreito',
      direcao: 'recebido',
      largura: 320,
      altura: 120,
      ancora: { idAudio: 'audio-estreito', x: 50, y: 100, largura: 400, altura: 60, visivel: true }
    }
  ];

  // Viewport de 480 px: 480 - (50 + 400) = 30 px < 320 px
  const posicoes = calcularPosicoesJanelas(reqs, 480);
  assert.equal(posicoes.length, 1);
  // Posiciona abaixo do balão: x = 50, y = 100 + 60 + 8 = 168
  assert.equal(posicoes[0]?.x, 50);
  assert.equal(posicoes[0]?.y, 168);
});

// BUG-20261002-A4MZ: o espaço livre ao lado do balão é o da área da conversa (RF-01), não o da tela.
// Contado da borda da tela, o espaço à esquerda incluía a lista de conversas, e a janela abria sobre ela.
test('calcularPosicoesJanelas mede o espaço lateral dentro da área da conversa e, sem ele, abre abaixo do balão', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-recebido',
      direcao: 'recebido',
      largura: 320,
      altura: 120,
      ancora: { idAudio: 'audio-recebido', x: 550, y: 66, largura: 336, altura: 62, visivel: true }
    }
  ];

  // Área da conversa de 600 px, de x = 488 a 1088: 194 px livres à direita do balão e 54 à esquerda
  const posicoes = calcularPosicoesJanelas(reqs, 1088, 488);
  assert.equal(posicoes[0]?.visivel, true);
  // Abaixo do balão e dentro da área: x = 550, y = 66 + 62 + 8 = 136
  assert.equal(posicoes[0]?.x, 550);
  assert.equal(posicoes[0]?.y, 136);
});

// BUG-20261002-K3DY: a colisão vale só entre janelas que se cruzam na horizontal (RF-05). Numa área de
// conversa larga, a janela de um áudio enviado, à esquerda do seu balão, não alcança a de um recebido, à
// direita do seu, e não a empurra para baixo do topo do balão (RF-01).
function requisicao(idAudio: string, direcao: 'recebido' | 'enviado', xBalao: number, yBalao: number, altura: number): RequisicaoPosicionamento {
  return {
    idAudio,
    direcao,
    largura: 320,
    altura,
    ancora: { idAudio, x: xBalao, y: yBalao, largura: 336, altura: 62, visivel: true }
  };
}

test('calcularPosicoesJanelas não desloca a janela que não cruza, na horizontal, a janela de cima', () => {
  const reqs = [requisicao('enviado', 'enviado', 1600, 66, 190), requisicao('recebido', 'recebido', 550, 136, 190)];

  // Área da conversa de x = 488 a 2000: enviado de 1600 − 320 − 8 = 1272 a 1592; recebido de 894 a 1214
  const posicoes = calcularPosicoesJanelas(reqs, 2000, 488);
  assert.equal(posicoes[0]?.x, 1272);
  assert.equal(posicoes[1]?.x, 894);
  assert.equal(posicoes[1]?.y, 136);
  assert.equal(posicoes[1]?.deslocadaPorColisao, false);
});

test('calcularPosicoesJanelas desloca a janela pela de cima que a cruza, mesmo com outra, de lado oposto, entre as duas', () => {
  const reqs = [
    requisicao('recebido-1', 'recebido', 550, 66, 190),
    requisicao('enviado', 'enviado', 1600, 100, 190),
    requisicao('recebido-2', 'recebido', 550, 136, 100)
  ];

  const porId = new Map(calcularPosicoesJanelas(reqs, 2000, 488).map((p) => [p.idAudio, p]));
  // A do enviado, do outro lado, fica no topo do seu balão
  assert.equal(porId.get('enviado')?.y, 100);
  assert.equal(porId.get('enviado')?.deslocadaPorColisao, false);
  // A do segundo recebido desce pela do primeiro, que a cruza: 66 + 190 + 8 = 264
  assert.equal(porId.get('recebido-2')?.y, 264);
  assert.equal(porId.get('recebido-2')?.deslocadaPorColisao, true);
});

// BUG-20261002-HVT4: a área das mensagens tem topo e fundo, o fim do cabeçalho e o começo da caixa de
// escrita. A janela que passaria do fundo sobe até terminar 8 px acima dele, e a pilha acima dela sobe
// junto; nunca acima do topo. Geometria da aceitação do A4MZ: mensagens de y = 64 a 844, área da
// conversa de x = 551 a 1624, balões de voz recebidos de 336 × 68 px em x = 613.
const MENSAGENS = { topo: 64, fundo: 844 };

function voz(idAudio: string, yBalao: number, altura: number): RequisicaoPosicionamento {
  return {
    idAudio,
    direcao: 'recebido',
    largura: 320,
    altura,
    ancora: { idAudio, x: 613, y: yBalao, largura: 336, altura: 68, visivel: true }
  };
}

const ys = (posicoes: Array<{ y: number }>) => posicoes.map((p) => p.y);

test('calcularPosicoesJanelas sobe a janela que passaria do fim da área das mensagens até terminar 8 px acima dele', () => {
  // O último áudio da conversa, com texto longo: 739 + 242 = 981 passaria de 844
  const [janela] = calcularPosicoesJanelas([voz('P', 739, 242)], 1624, 551, MENSAGENS);
  assert.equal(janela?.visivel, true);
  assert.equal(janela?.x, 957);
  assert.equal(janela?.y, 844 - 8 - 242);
});

test('calcularPosicoesJanelas sobe em bloco a pilha que passaria do fim da área, mantendo os vãos de 8 px', () => {
  // Quatro áudios no pé da conversa: na descida, a pilha iria de 434 a 1117
  const reqs = [voz('Q1', 434, 139), voz('Q2', 529, 242), voz('Q3', 624, 139), voz('Q4', 719, 139)];
  const posicoes = calcularPosicoesJanelas(reqs, 1624, 551, MENSAGENS);
  // De baixo para cima: 836 − 139 = 697; 697 − 8 − 139 = 550; 550 − 8 − 242 = 300; 300 − 8 − 139 = 153
  assert.deepEqual(ys(posicoes), [153, 300, 550, 697]);
});

test('calcularPosicoesJanelas começa no topo da área a pilha mais alta que ela, sem sobreposição, e só o excesso passa do fim', () => {
  // Cinco janelas de 190 px somam 982 px com os vãos; a área tem 780
  const reqs = [149, 244, 339, 434, 529].map((y, i) => voz(`R${i + 1}`, y, 190));
  const posicoes = calcularPosicoesJanelas(reqs, 1624, 551, MENSAGENS);
  assert.deepEqual(ys(posicoes), [64, 262, 460, 658, 856]);
});

test('calcularPosicoesJanelas mantém no topo do balão a janela que cabe na área das mensagens (RF-01)', () => {
  const [janela] = calcularPosicoesJanelas([voz('A', 149, 242)], 1624, 551, MENSAGENS);
  assert.equal(janela?.y, 149);
  assert.equal(janela?.deslocadaPorColisao, false);
});

test('calcularPosicoesJanelas oculta a janela do balão sob a caixa de escrita ou sob o cabeçalho, e começa no topo da área a do balão em parte sob o cabeçalho (RF-03)', () => {
  const porId = new Map(
    calcularPosicoesJanelas([voz('sob-a-caixa', 844, 139), voz('sob-o-cabecalho', -10, 139), voz('em-parte', 30, 139)], 1624, 551, MENSAGENS)
      .map((p) => [p.idAudio, p])
  );
  // O balão de y = 844 a 912 está na tela, mas sob a caixa de escrita; o de −10 a 58, sob o cabeçalho
  assert.equal(porId.get('sob-a-caixa')?.visivel, false);
  assert.equal(porId.get('sob-o-cabecalho')?.visivel, false);
  // O de 30 a 98 aparece de 64 a 98: a janela começa no topo da área, e não sob o cabeçalho
  assert.equal(porId.get('em-parte')?.visivel, true);
  assert.equal(porId.get('em-parte')?.y, 64);
});

test('calcularPosicoesJanelas abre acima do balão, sem cobri-lo, a janela do modo abaixo (RF-02) que não cabe abaixo dele no pé da conversa', () => {
  // Área da conversa de 600 px (x de 551 a 1151): sem espaço ao lado, a janela iria para 739 + 68 + 8 = 815
  const [janela] = calcularPosicoesJanelas([voz('estreita', 739, 139)], 1151, 551, MENSAGENS);
  assert.equal(janela?.x, 613);
  // Acima do balão: 739 − 8 − 139 = 592, terminando 8 px antes do topo do balão
  assert.equal(janela?.y, 592);
});

// BUG-20261002-OW7G: a seta do RF-05 liga cada janela ao balão de origem. A ponta fica na borda do balão
// voltada para a janela, à altura do centro da parte visível dele; a cauda, na lateral da janela. Se esse
// centro cabe na lateral da janela, a 10 px dos cantos, a seta é reta; senão, faz cotovelo num trilho do
// corredor de 8 px entre o balão e a janela, saindo a 10 px do topo (ou do fundo) da janela.
interface SetaLateral {
  direcao: string;
  pontaX: number;
  pontaY: number;
  caudaX: number;
  caudaY: number;
  trilho: number;
}

function setas(posicoes: Array<{ idAudio: string }>): Map<string, SetaLateral> {
  return new Map(posicoes.map((p) => [p.idAudio, (p as unknown as { seta: SetaLateral }).seta]));
}

// Dois cotovelos se cruzam quando um trecho horizontal de um atravessa o vertical do outro, ou quando
// os verticais correm no mesmo trilho em alturas que se sobrepõem
function cruzam(a: SetaLateral, b: SetaLateral): boolean {
  const entre = (v: number, x: number, y: number) => v > Math.min(x, y) && v < Math.max(x, y);
  const horizontaisCruzam = (h: SetaLateral, v: SetaLateral) =>
    [[h.caudaY, h.caudaX], [h.pontaY, h.pontaX]].some(([y, x]) => entre(v.trilho, x!, h.trilho) && entre(y!, v.caudaY, v.pontaY));
  const mesmoTrilho = a.trilho === b.trilho &&
    Math.min(Math.max(a.caudaY, a.pontaY), Math.max(b.caudaY, b.pontaY)) > Math.max(Math.min(a.caudaY, a.pontaY), Math.min(b.caudaY, b.pontaY));
  return horizontaisCruzam(a, b) || horizontaisCruzam(b, a) || mesmoTrilho;
}

function semCruzamentos(lista: SetaLateral[]): void {
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      assert.equal(cruzam(lista[i]!, lista[j]!), false, `setas se cruzam: ${JSON.stringify([lista[i], lista[j]])}`);
    }
  }
}

// Trilho no corredor, depois dos 4 px da ponta e antes da borda da janela
function noCorredor(seta: SetaLateral): void {
  assert.ok(seta.trilho > seta.pontaX + 3.5 && seta.trilho < seta.caudaX - 0.5, `trilho fora do corredor: ${JSON.stringify(seta)}`);
}

test('calcularPosicoesJanelas liga por uma seta reta a janela à altura do seu balão, com a ponta na borda dele, no recebido e no enviado (RF-05, seção 8)', () => {
  const enviado: RequisicaoPosicionamento = {
    idAudio: 'E', direcao: 'enviado', largura: 320, altura: 139,
    ancora: { idAudio: 'E', x: 1200, y: 400, largura: 336, altura: 68, visivel: true }
  };
  const porId = setas(calcularPosicoesJanelas([voz('R', 149, 139), enviado], 1624, 551, MENSAGENS));

  // Recebido: balão de 613 a 949, janela a partir de 957; centro do balão em 149 + 34
  const r = porId.get('R')!;
  assert.deepEqual([r.direcao, r.pontaX, r.pontaY, r.caudaX, r.caudaY], ['esquerda', 949, 183, 957, 183]);
  // Enviado: janela de 872 a 1192, balão a partir de 1200
  const e = porId.get('E')!;
  assert.deepEqual([e.direcao, e.pontaX, e.pontaY, e.caudaX, e.caudaY], ['direita', 1200, 434, 1192, 434]);
});

test('calcularPosicoesJanelas liga a janela deslocada ao centro do seu balão por um cotovelo no corredor, saindo 10 px abaixo do topo da janela (RF-05)', () => {
  // Os quatro áudios da aceitação do K3DY: janelas em 149, 296, 546 e 693
  const reqs = [voz('S1', 149, 139), voz('S2', 244, 242), voz('S3', 339, 139), voz('S4', 434, 139)];
  const posicoes = calcularPosicoesJanelas(reqs, 1624, 551, MENSAGENS);
  assert.deepEqual(ys(posicoes), [149, 296, 546, 693]);
  const porId = setas(posicoes);

  assert.equal(porId.get('S1')!.caudaY, porId.get('S1')!.pontaY, 'a janela alinhada ao balão não tem seta reta');
  for (const [id, ponta, cauda] of [['S2', 278, 306], ['S3', 373, 556], ['S4', 468, 703]] as const) {
    const seta = porId.get(id)!;
    assert.deepEqual([seta.direcao, seta.pontaX, seta.pontaY, seta.caudaX, seta.caudaY], ['esquerda', 949, ponta, 957, cauda], id);
    noCorredor(seta);
  }
});

test('calcularPosicoesJanelas põe em trilhos distintos, sem cruzamento, os cotovelos que se sobrepõem, subindo ou descendo até o balão', () => {
  // Subindo: as janelas deslocadas para baixo pela colisão (S3 e S4 se sobrepõem de 468 a 556)
  const abaixo = calcularPosicoesJanelas([voz('S1', 149, 139), voz('S2', 244, 242), voz('S3', 339, 139), voz('S4', 434, 139)], 1624, 551, MENSAGENS);
  semCruzamentos([...setas(abaixo).values()]);

  // Descendo: a pilha que subiu para caber no pé da conversa fica acima dos balões, de 40 px
  const baixo = (idAudio: string, yBalao: number): RequisicaoPosicionamento => ({
    idAudio, direcao: 'recebido', largura: 320, altura: 200,
    ancora: { idAudio, x: 613, y: yBalao, largura: 336, altura: 40, visivel: true }
  });
  const acima = calcularPosicoesJanelas([baixo('B1', 690), baixo('B2', 740), baixo('B3', 790)], 1624, 551, MENSAGENS);
  assert.deepEqual(ys(acima), [220, 428, 636]);
  const porId = setas(acima);
  // B1 e B2 descem da janela até o balão (410 a 710 e 618 a 760): os trechos verticais se sobrepõem
  assert.deepEqual([porId.get('B1')!.caudaY, porId.get('B1')!.pontaY], [410, 710]);
  assert.deepEqual([porId.get('B2')!.caudaY, porId.get('B2')!.pontaY], [618, 760]);
  assert.notEqual(porId.get('B1')!.trilho, porId.get('B2')!.trilho);
  for (const seta of [porId.get('B1')!, porId.get('B2')!]) noCorredor(seta);
  semCruzamentos([...porId.values()]);
});

test('calcularPosicoesJanelas liga por uma seta vertical a janela do modo abaixo (RF-02), abaixo ou acima do balão', () => {
  // Área da conversa de 600 px: a janela vai abaixo do balão (x de 613 a 933) e, no pé da conversa, acima dele
  const porId = setas(calcularPosicoesJanelas([voz('topo', 149, 139), voz('pe', 739, 139)], 1151, 551, MENSAGENS));
  const topo = porId.get('topo')!;
  assert.deepEqual([topo.direcao, topo.pontaX, topo.pontaY, topo.caudaX, topo.caudaY], ['acima', 773, 217, 773, 225]);
  const pe = porId.get('pe')!;
  assert.deepEqual([pe.direcao, pe.pontaX, pe.pontaY, pe.caudaX, pe.caudaY], ['abaixo', 773, 739, 773, 731]);
});

test('calcularPosicoesJanelas não dá seta à janela oculta, e a seta da janela do balão em parte sob o cabeçalho mira a parte visível dele', () => {
  const porId = setas(calcularPosicoesJanelas([voz('sob-a-caixa', 844, 139), voz('em-parte', 30, 139)], 1624, 551, MENSAGENS));
  assert.equal(porId.get('sob-a-caixa'), null);
  // O balão aparece de 64 a 98: centro em 81, à altura da janela, de 64 a 203
  const seta = porId.get('em-parte')!;
  assert.deepEqual([seta.pontaY, seta.caudaY], [81, 81]);
});
