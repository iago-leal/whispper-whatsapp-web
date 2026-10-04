// Janelas no navegador (BUG-20261002-K3DY): o gerenciador, montado do código-fonte, roda no Chrome for
// Testing com a folha de estilos real, numa página neutra, sem o WhatsApp. Só ali a janela tem altura,
// a do texto até 240 px (RF-07), e a posição de cada janela depende da altura das de cima (RF-05). As
// âncoras simulam balões de voz recebidos de 336 × 62 px, a 70 px um do outro, na área da conversa do
// print do BUG-20261002-A4MZ (x de 488 a 1316). Os testes do BUG-20261002-HVT4 usam a geometria do WhatsApp
// real, com a altura da área das mensagens (evidence/estrutura-vertical-whatsapp-real.md do bug).
//
// Sem rede, sem conta e sem efeito fora do diretório temporário. Pulado sem o Chrome for Testing.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { localizarNavegador, Navegador, type Pagina } from "./suporte/navegador-cdp.ts";

const EXTENSAO = fileURLToPath(new URL("..", import.meta.url));

const FRASE = "Oi, tudo bem? Passei aqui para avisar que chego um pouco mais tarde hoje.";
const TEXTOS = {
  curto: "Pode deixar.",
  medio: `${FRASE} ${FRASE}`,
  longo: Array.from({ length: 12 }, () => FRASE).join(" "),
};

// Ajudantes da página. O retângulo-alvo é a posição do transform aplicado com o tamanho desenhado: não
// depende da transição, que só anima o caminho até ele. O desenhado é o que a tela mostra no instante.
const AJUDANTES = `
  var T = ${JSON.stringify(TEXTOS)};
  var AREA = { esquerda: 488, direita: 1316 };
  function ancora(id, i) { return { idAudio: id, x: 550, y: 66 + 70 * i, largura: 336, altura: 62, visivel: true }; }
  function concluido(texto) {
    return { tipo: "concluido", texto, idioma: "pt", tempos: { esperaTotalMs: 9700, esperaFilaMs: 0, duracaoAudioSeg: 13 } };
  }
  function janela(id) { return document.querySelector('.whispper-janela[aria-label="Transcrição do áudio ' + id + '"]'); }
  function alvo(id) {
    var el = janela(id);
    var m = /translate3d\\((-?[\\d.]+)px, (-?[\\d.]+)px/.exec(el.style.transform);
    return { id, x: Number(m[1]), y: Number(m[2]), largura: el.offsetWidth, altura: el.offsetHeight };
  }
  function desenhado(id) {
    var r = janela(id).getBoundingClientRect();
    return { id, x: r.left, y: r.top, largura: r.width, altura: r.height };
  }
  // Gerenciador com o i-ésimo balão para o i-ésimo id e a área da conversa do print
  function novoGerenciador(ids) {
    return new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), function (id) { return ancora(id, ids.indexOf(id)); }, function () { return AREA; });
  }
  // Geometria do WhatsApp real (BUG-20261002-HVT4), numa tela de 1624 × 907: área da conversa de x = 551 a
  // 1624, mensagens de y = 64 (fim do cabeçalho) a 844 (começo da caixa de escrita), balões de voz recebidos
  // de 336 × 68 px em x = 613
  var AREA_REAL = { esquerda: 551, direita: 1624, topo: 64, fundo: 844 };
  var ERRO = { tipo: "erro", mensagem: "O motor não conseguiu transcrever este áudio.", motivo: "FALHA_NA_TRANSCRICAO", falhouAposMs: 0 };
  function balao(id, y) { return { idAudio: id, x: 613, y: y, largura: 336, altura: 68, visivel: true }; }
  // Gerenciador com o balão de cada id no y dado
  function gerenciadorReal(ysDosBaloes) {
    return new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), function (id) { return balao(id, ysDosBaloes[id]); }, function () { return AREA_REAL; });
  }
  // Geometria da reprodução do BUG-20261004-TTLJ, numa tela de 1200 × 832: área da conversa de x = 544 a 1200
  // (656 px, abaixo dos 726 do modo lateral), mensagens de y = 64 a 768, balões de voz enviados de 336 × 89 px
  // em x = 807. Toda janela cai no modo abaixo (RF-02).
  var AREA_ESTREITA = { esquerda: 544, direita: 1200, topo: 64, fundo: 768 };
  function balaoEnviado(id, y) { return { idAudio: id, x: 807, y: y, largura: 336, altura: 89, visivel: true }; }
  function gerenciadorEstreito(ysDosBaloes) {
    return new W.GerenciadorDeJanelas(new W.CronometroDeEspera(), function (id) { return balaoEnviado(id, ysDosBaloes[id]); }, function () { return AREA_ESTREITA; });
  }
  function aVista(id) { var el = janela(id); return !!el && !el.classList.contains("whispper-janela-oculta"); }
  // Seta da janela (BUG-20261002-OW7G), lida do traçado-alvo, que não depende da transição: a linha vai da
  // cauda, na lateral da janela, ao trilho, sobe ou desce até a altura da ponta e entra no balão
  // (M cauda H trilho V ponta H ponta); o triângulo da ponta começa no bico.
  function seta(id) {
    var g = document.querySelector('.whispper-setas [data-whispper-seta-de="' + id + '"]');
    if (!g) return null;
    var numeros = function (d) { return (d.match(/-?[0-9.]+/g) || []).map(Number); };
    var linha = numeros(g.querySelector(".whispper-seta-linha").style.d);
    var bico = numeros(g.querySelector(".whispper-seta-ponta").style.d);
    return { id: id, caudaX: linha[0], caudaY: linha[1], trilho: linha[2], pontaY: linha[3], pontaX: linha[4],
             bico: [bico[0], bico[1]], oculta: getComputedStyle(g).display === "none" };
  }
`;

interface SetaLida {
  id: string;
  caudaX: number;
  caudaY: number;
  trilho: number;
  pontaY: number;
  pontaX: number;
  bico: [number, number];
  oculta: boolean;
}

// A seta de cada janela aponta para o seu balão: bico e ponta na borda direita do balão (x = 949), à
// altura dele; cauda na borda esquerda da janela, à altura dela; todo o traçado no corredor entre os dois,
// sem cobrir balão nem janela. E nenhum par de setas se cruza nem corre no mesmo trilho.
function conferirSetas(setas: Array<SetaLida | null>, alvos: Retangulo[], ysDosBaloes: number[]): void {
  setas.forEach((seta, i) => {
    const contexto = JSON.stringify({ seta, janela: alvos[i], balao: ysDosBaloes[i] });
    assert.ok(seta && !seta.oculta, `a janela ${alvos[i]!.id} não tem seta visível: ${contexto}`);
    assert.ok(Math.abs(seta.pontaX - 949) <= 0.5 && seta.pontaY >= ysDosBaloes[i]! && seta.pontaY <= ysDosBaloes[i]! + 68, `a ponta não está no balão: ${contexto}`);
    assert.deepEqual(seta.bico, [seta.pontaX, seta.pontaY], `o bico não está na ponta: ${contexto}`);
    assert.ok(Math.abs(seta.caudaX - alvos[i]!.x) <= 0.5 && seta.caudaY >= alvos[i]!.y && seta.caudaY <= alvos[i]!.y + alvos[i]!.altura, `a cauda não está na janela: ${contexto}`);
    assert.ok(seta.trilho >= 949 && seta.trilho <= alvos[i]!.x, `o traçado sai do corredor: ${contexto}`);
  });
  const entre = (v: number, a: number, b: number) => v > Math.min(a, b) && v < Math.max(a, b);
  for (const a of setas as SetaLida[]) {
    for (const b of setas as SetaLida[]) {
      if (a === b) continue;
      const atravessa = [[a.caudaY, a.caudaX], [a.pontaY, a.pontaX]].some(([y, x]) => entre(b.trilho, x!, a.trilho) && entre(y!, b.caudaY, b.pontaY));
      const mesmoTrilho = a.trilho === b.trilho && Math.min(Math.max(a.caudaY, a.pontaY), Math.max(b.caudaY, b.pontaY)) > Math.max(Math.min(a.caudaY, a.pontaY), Math.min(b.caudaY, b.pontaY));
      assert.ok(!atravessa && !mesmoTrilho, `as setas de ${a.id} e ${b.id} se cruzam: ${JSON.stringify([a, b])}`);
    }
  }
}

// Tela do WhatsApp real nas aceitações do A4MZ e do K3DY
const TELA_REAL = { largura: 1624, altura: 907 };
const MENSAGENS = { topo: 64, fundo: 844 };

interface Retangulo {
  id: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
}

// Pares de janelas que se cruzam, com quanto se cruzam na vertical
function cruzamentos(retangulos: Retangulo[]): string[] {
  const achados: string[] = [];
  for (let i = 0; i < retangulos.length; i++) {
    for (let j = i + 1; j < retangulos.length; j++) {
      const a = retangulos[i]!;
      const b = retangulos[j]!;
      const dx = Math.min(a.x + a.largura, b.x + b.largura) - Math.max(a.x, b.x);
      const dy = Math.min(a.y + a.altura, b.y + b.altura) - Math.max(a.y, b.y);
      if (dx > 0 && dy > 0) achados.push(`${a.id} e ${b.id} se cruzam em ${Math.round(dy)} px na vertical`);
    }
  }
  return achados;
}

async function montarPagina(): Promise<string> {
  const pacote = await build({
    stdin: {
      contents: `export { GerenciadorDeJanelas } from "./src/content/gerenciador-janelas.ts";
                 export { CronometroDeEspera } from "./src/content/cronometro-espera.ts";`,
      resolveDir: EXTENSAO,
      loader: "ts",
    },
    bundle: true, format: "iife", globalName: "W", write: false, logLevel: "warning",
  });
  const css = readFileSync(join(EXTENSAO, "src", "content", "janela-flutuante.css"), "utf8");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}${css}</style></head>` +
    `<body><script>${pacote.outputFiles[0]!.text}</script><script>${AJUDANTES}</script></body></html>`;
}

const executavel = localizarNavegador();

test("janelas flutuantes no navegador, com a altura desenhada", {
  skip: executavel ? false : "Chrome for Testing não encontrado: rode npx playwright install chromium ou defina WHISPPER_E2E_NAVEGADOR",
  timeout: 60_000,
}, async (t) => {
  const raiz = mkdtempSync(join(tmpdir(), "whispper-janelas-"));
  // O navegador de teste sempre carrega uma extensão; esta é vazia, porque a página não é a do WhatsApp
  const extensao = join(raiz, "extensao");
  mkdirSync(extensao, { recursive: true });
  writeFileSync(join(extensao, "manifest.json"), JSON.stringify({ manifest_version: 3, name: "vazia", version: "1" }));
  const html = await montarPagina();
  const navegador = await Navegador.abrir(executavel!, join(raiz, "perfil"), extensao);
  t.after(async () => {
    await navegador.fechar();
    rmSync(raiz, { recursive: true, force: true });
  });

  // Uma página por teste, na tela do print e em primeiro plano: em segundo plano, a transição não anda
  async function abrirPagina(tela = { largura: 1316, altura: 806 }): Promise<Pagina> {
    const p = await navegador.abrirPagina("about:blank");
    await p.definirTamanho(tela.largura, tela.altura);
    await p.navegarSimulado("https://exemplo.test/", html);
    await p.aguardar("typeof W !== 'undefined' && typeof novoGerenciador === 'function'", 10_000, "o gerenciador carregar");
    await p.trazerParaFrente();
    return p;
  }

  await t.test("reprodução: cinco áudios consecutivos concluídos, com textos de alturas diferentes e um no limite de 240 px, resultam em cinco janelas sem sobreposição (RF-05, RF-07)", async () => {
    const p = await abrirPagina();
    const { alvos, longaRola } = await p.avaliar<{ alvos: Retangulo[]; longaRola: boolean }>(`(() => {
      const ids = ["A1", "A2", "A3", "A4", "A5"];
      const textos = [T.medio, T.curto, T.longo, T.medio, T.curto];
      const g = novoGerenciador(ids);
      for (const id of ids) g.abrir(id);
      ids.forEach((id, i) => g.definirEstado(id, concluido(textos[i])));
      const corpo = janela("A3").querySelector(".whispper-janela-corpo");
      return { alvos: ids.map(alvo), longaRola: corpo.scrollHeight > corpo.clientHeight };
    })()`);

    assert.ok(longaRola, "a janela do texto longo não chegou ao limite de 240 px com rolagem interna");
    assert.ok(new Set(alvos.map((a) => a.altura)).size >= 3, `as janelas não têm alturas diferentes: ${JSON.stringify(alvos)}`);
    assert.deepEqual(cruzamentos(alvos), [], `janelas sobrepostas: ${JSON.stringify(alvos)}`);
  });

  await t.test("reprodução: quando a janela de cima cresce ao concluir, a de baixo desce e nenhuma se sobrepõe (RF-05)", async () => {
    const p = await abrirPagina();
    const { antes, depois } = await p.avaliar<{ antes: Retangulo[]; depois: Retangulo[] }>(`(() => {
      const ids = ["B1", "B2"];
      const g = novoGerenciador(ids);
      for (const id of ids) g.abrir(id);
      const antes = ids.map(alvo);
      g.definirEstado("B1", concluido(T.longo));
      return { antes, depois: ids.map(alvo) };
    })()`);

    assert.ok(depois[0]!.altura > antes[0]!.altura, `a janela de cima não cresceu ao concluir: ${JSON.stringify({ antes, depois })}`);
    assert.ok(depois[1]!.y > antes[1]!.y, `a janela de baixo não desceu: ${JSON.stringify({ antes, depois })}`);
    assert.deepEqual(cruzamentos(depois), [], `sobrepostas logo após a mudança de estado: ${JSON.stringify(depois)}`);

    // A de baixo desce com a transição de 120 ms do transform; ao fim dela, a tela também não as sobrepõe.
    // Espera-se o fim da transição, e não um tempo fixo: com a máquina ocupada, os quadros atrasam.
    await p.aguardar(`janela("B2").getAnimations().length === 0`, 5_000, "a janela de baixo terminar de descer");
    const desenhados = await p.avaliar<Retangulo[]>(`["B1", "B2"].map(desenhado)`);
    assert.deepEqual(cruzamentos(desenhados), [], `sobrepostas na tela ao fim da transição: ${JSON.stringify(desenhados)}`);
  });

  // A janela nova recebe a posição antes de entrar na página e só é medida depois; um segundo cálculo,
  // já com a altura dela, acomoda as janelas de baixo.
  await t.test("a janela aberta acima de outra já aberta a empurra pela altura desenhada, a 8 px (RF-05)", async () => {
    const p = await abrirPagina();
    const [nova, deBaixo] = await p.avaliar<Retangulo[]>(`(() => {
      const ids = ["D1", "D2"];
      const g = novoGerenciador(ids);
      g.abrir("D2");
      g.abrir("D1");
      return ids.map(alvo);
    })()`);

    assert.equal(deBaixo!.y, nova!.y + nova!.altura + 8, `a janela de baixo não ficou a 8 px da nova: ${JSON.stringify([nova, deBaixo])}`);
  });

  // BUG-20261002-A4MZ, revisão 1 do plano: medida antes de receber a posição, a janela ganha estilo sem
  // transform, e a transição a faz deslizar do canto da tela até o balão. A outra janela aberta força a
  // medida da página durante a abertura da segunda.
  await t.test("a janela nova entra na página já na posição, sem deslizar do canto da tela (RF-01)", async () => {
    const p = await abrirPagina();
    const leituras = await p.avaliar<Array<{ id: string; transicoes: number; alvo: Retangulo; desenhado: Retangulo }>>(`(() => {
      const ids = ["C1", "C2"];
      const g = novoGerenciador(ids);
      g.abrir("C1");
      g.abrir("C2");
      return ids.map((id) => ({ id, transicoes: janela(id).getAnimations().length, alvo: alvo(id), desenhado: desenhado(id) }));
    })()`);

    for (const { id, transicoes, alvo, desenhado } of leituras) {
      assert.equal(transicoes, 0, `a janela ${id} abriu com transição em curso`);
      assert.deepEqual([Math.round(desenhado.x), Math.round(desenhado.y)], [alvo.x, alvo.y], `a janela ${id} não abriu no destino`);
    }
  });

  // BUG-20261002-HVT4: a janela do último áudio começava no topo do balão e descia sobre a caixa de
  // escrita e além da tela (739 a 981 no WhatsApp real); "Copiar" e o resumo ficavam abaixo da tela.
  await t.test("reprodução: a janela do último áudio, no pé da conversa, fica inteira na área das mensagens, com \"Copiar\" visível (critérios 1 e 2 do HVT4)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const { janela, fimDoCopiar } = await p.avaliar<{ janela: Retangulo; fimDoCopiar: number }>(`(() => {
      const g = gerenciadorReal({ P: 739 });
      g.abrir("P");
      g.definirEstado("P", concluido(T.longo));
      const a = alvo("P");
      const copiar = [...janela("P").querySelectorAll("button")].find((b) => b.textContent === "Copiar");
      return { janela: a, fimDoCopiar: a.y + copiar.offsetTop + copiar.offsetHeight };
    })()`);

    assert.ok(janela.altura >= 240, `a janela não chegou ao limite do RF-07: ${JSON.stringify(janela)}`);
    assert.ok(janela.y >= MENSAGENS.topo, `a janela começa sob o cabeçalho: ${JSON.stringify(janela)}`);
    assert.ok(janela.y + janela.altura <= MENSAGENS.fundo - 8, `a janela passa do fim da área das mensagens: ${JSON.stringify(janela)}`);
    assert.ok(fimDoCopiar <= MENSAGENS.fundo, `"Copiar" termina em ${fimDoCopiar}, sob a caixa de escrita`);

    // Ao fim da transição, a tela também a mostra inteira
    await p.aguardar(`janela("P").getAnimations().length === 0`, 5_000, "a janela terminar de subir");
    const [desenhada] = await p.avaliar<Retangulo[]>(`["P"].map(desenhado)`);
    assert.ok(desenhada!.y + desenhada!.altura <= MENSAGENS.fundo, `na tela, a janela passa do fim da área: ${JSON.stringify(desenhada)}`);
  });

  await t.test("reprodução: quatro áudios no pé da conversa empilham-se dentro da área das mensagens, sem sobreposição (EC-05, RF-05)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const alvos = await p.avaliar<Retangulo[]>(`(() => {
      const ids = ["Q1", "Q2", "Q3", "Q4"];
      const g = gerenciadorReal({ Q1: 434, Q2: 529, Q3: 624, Q4: 719 });
      for (const id of ids) g.abrir(id);
      [ERRO, concluido(T.longo), ERRO, ERRO].forEach((estado, i) => g.definirEstado(ids[i], estado));
      return ids.map(alvo);
    })()`);

    for (const a of alvos) {
      assert.ok(a.y >= MENSAGENS.topo && a.y + a.altura <= MENSAGENS.fundo - 8, `janela fora da área das mensagens: ${JSON.stringify(alvos)}`);
    }
    assert.deepEqual(cruzamentos(alvos), [], `janelas sobrepostas: ${JSON.stringify(alvos)}`);
  });

  // A subida faz a posição da janela nova depender da altura dela: no pé da conversa, o primeiro cálculo
  // do abrir (altura suposta de 160 px) e o segundo (a medida) a põem em lugares diferentes, e a janela
  // recém-entrada deslizaria entre eles. O balão vai de 780 a 848, em parte sob a caixa de escrita. Guarda:
  // passa sem a subida, em que a janela fica no topo do balão; a subida é provada pelos testes acima.
  await t.test("a janela nova aberta no pé da conversa entra na página já no lugar, sem deslizar (RF-01; lição do K3DY)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const { transicoes, janela, desenhada } = await p.avaliar<{ transicoes: number; janela: Retangulo; desenhada: Retangulo }>(`(() => {
      const g = gerenciadorReal({ N: 780 });
      g.abrir("N");
      return { transicoes: janela("N").getAnimations().length, janela: alvo("N"), desenhada: desenhado("N") };
    })()`);

    assert.equal(transicoes, 0, `a janela abriu com transição em curso: ${JSON.stringify(janela)}`);
    assert.deepEqual([Math.round(desenhada.x), Math.round(desenhada.y)], [janela.x, janela.y], "a janela não abriu no destino");
  });

  // BUG-20261002-OW7G: as janelas deslocadas ficavam abaixo dos seus balões sem nada que as ligasse a eles.
  // O critério do RF-05, com cinco áudios na geometria do WhatsApp real: a pilha sobe para caber, as duas
  // primeiras ficam à altura dos balões (seta reta) e as três últimas, abaixo deles (cotovelo).
  const CINCO = `var ids = ["S1", "S2", "S3", "S4", "S5"];
    var ys = { S1: 149, S2: 244, S3: 339, S4: 434, S5: 529 };
    var g = gerenciadorReal(ys);
    for (const id of ids) g.abrir(id);
    [ERRO, concluido(T.medio), ERRO, ERRO, concluido(T.curto)].forEach((estado, i) => g.definirEstado(ids[i], estado));`;

  await t.test("reprodução: cinco áudios consecutivos resultam em cinco janelas, nenhuma sobreposta, cada seta apontando para o balão correto (critério do RF-05)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const { alvos, setas } = await p.avaliar<{ alvos: Retangulo[]; setas: Array<SetaLida | null> }>(`(() => {
      ${CINCO}
      return { alvos: ids.map(alvo), setas: ids.map(seta) };
    })()`);

    assert.deepEqual(cruzamentos(alvos), [], `janelas sobrepostas: ${JSON.stringify(alvos)}`);
    conferirSetas(setas, alvos, [149, 244, 339, 434, 529]);
    assert.equal(setas[0]!.caudaY, setas[0]!.pontaY, `a janela à altura do balão não tem seta reta: ${JSON.stringify(setas[0])}`);
    assert.ok(setas.slice(2).every((seta) => seta!.caudaY !== seta!.pontaY), `as janelas abaixo dos balões não fazem cotovelo: ${JSON.stringify(setas)}`);
  });

  await t.test("reprodução: na rolagem, cada seta acompanha o seu balão e a sua janela (RF-03, critério 1 do OW7G)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const { alvos, setas } = await p.avaliar<{ alvos: Retangulo[]; setas: Array<SetaLida | null> }>(`(() => {
      ${CINCO}
      for (const id of ids) g.atualizarAncora(balao(id, ys[id] - 100));
      return { alvos: ids.map(alvo), setas: ids.map(seta) };
    })()`);

    conferirSetas(setas, alvos, [49, 144, 239, 334, 429]);
    // Ao fim da transição, a tela desenha a seta no alvo
    await p.aguardar(`[...document.querySelectorAll(".whispper-setas path")].every((d) => d.getAnimations().length === 0)`, 5_000, "as setas terminarem de andar");
    const desenhadas = await p.avaliar<boolean>(`[...document.querySelectorAll(".whispper-setas path")].every((d) => getComputedStyle(d).d === d.style.d)`);
    assert.ok(desenhadas, "ao fim da transição, alguma seta não está no alvo");
  });

  await t.test("a seta não rouba cliques e fica por trás das janelas (critério 3 do OW7G)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const leitura = await p.avaliar<{ primeira: boolean; eventos: string; noTrilho: string | null; seta: SetaLida | null }>(`(() => {
      const g = gerenciadorReal({ K1: 149, K2: 244 });
      g.abrir("K1");
      g.abrir("K2");
      g.definirEstado("K1", concluido(T.longo));
      const camada = document.querySelector(".whispper-setas");
      const s = seta("K2");
      const ponto = s && document.elementFromPoint(s.trilho, (s.caudaY + s.pontaY) / 2);
      return {
        primeira: !!camada && document.getElementById("whispper-janelas-container").firstElementChild === camada,
        eventos: camada ? getComputedStyle(camada).pointerEvents : "",
        noTrilho: ponto ? (ponto.closest(".whispper-setas") ? "seta" : ponto.tagName) : null,
        seta: s,
      };
    })()`);

    assert.ok(leitura.seta && leitura.seta.caudaY !== leitura.seta.pontaY, `a janela deslocada não tem cotovelo: ${JSON.stringify(leitura)}`);
    assert.equal(leitura.primeira, true, "a camada das setas não está atrás das janelas");
    assert.equal(leitura.eventos, "none", "a camada das setas recebe cliques");
    assert.notEqual(leitura.noTrilho, "seta", "o clique no trilho vai para a seta, e não para a conversa");
  });

  // Empurrada para baixo de uma janela alta, no pé da conversa, a janela nova sobe pela altura medida (HVT4),
  // e a cauda da seta, a 10 px do topo dela, vai junto: desenhada antes de a janela entrar na página, a seta
  // nasceria na posição provisória e deslizaria até a final.
  await t.test("a seta da janela nova nasce no lugar, mesmo quando a altura medida a move, e fechar a janela leva a seta junto (OW7G)", async () => {
    const p = await abrirPagina(TELA_REAL);
    const leitura = await p.avaliar<{ animacoes: number; alvo: string; desenhado: string; restantes: number }>(`(() => {
      const g = gerenciadorReal({ L1: 560, L2: 600 });
      g.abrir("L1");
      g.definirEstado("L1", concluido(T.longo));
      g.abrir("L2");
      const linha = document.querySelector('.whispper-setas [data-whispper-seta-de="L2"] .whispper-seta-linha');
      const r = { animacoes: linha.getAnimations().length, alvo: linha.style.d, desenhado: getComputedStyle(linha).d };
      g.fechar("L2");
      return { ...r, restantes: document.querySelectorAll('[data-whispper-seta-de="L2"]').length };
    })()`);

    assert.equal(leitura.animacoes, 0, `a seta da janela nova abriu com transição: ${JSON.stringify(leitura)}`);
    assert.equal(leitura.desenhado, leitura.alvo, "a seta da janela nova não nasceu no alvo");
    assert.equal(leitura.restantes, 0, "a seta ficou na página depois de a janela fechar");
  });

  // BUG-20261004-TTLJ: no modo abaixo, a pilha de janelas subia sobre os balões, inclusive o de cada uma, e a
  // seta vertical corria por trás da janela vizinha (no WhatsApp Web, três setas sem ponto visível em nove).
  // Cenário da reprodução: cinco áudios enviados, abertos em sequência, com textos de alturas diferentes.
  const TELA_ESTREITA = { largura: 1200, altura: 832 };
  const BALOES_ESTREITOS = [293, 410, 528, 645, 763];

  await t.test("reprodução: no modo abaixo, com cinco áudios abertos, nenhuma janela à vista cobre o próprio balão, e a seta de cada uma tem trecho visível (critérios 1 e 2 do TTLJ)", async () => {
    const p = await abrirPagina(TELA_ESTREITA);
    await p.avaliar<void>(`(() => {
      window.IDS = ["T1", "T2", "T3", "T4", "T5"];
      const g = gerenciadorEstreito({ T1: 293, T2: 410, T3: 528, T4: 645, T5: 763 });
      for (const id of IDS) g.abrir(id, "enviado");
      [concluido(T.medio), ERRO, concluido(T.medio), concluido(T.longo), concluido(T.medio)].forEach((estado, i) => g.definirEstado(IDS[i], estado));
    })()`);
    // A tela, e não só o alvo: a seta some quando uma janela desenhada está por cima dela
    await p.aguardar(`[...document.querySelectorAll(".whispper-janela, .whispper-setas path")].every((e) => e.getAnimations().length === 0)`, 5_000, "as janelas e as setas pararem");
    const leituras = await p.avaliar<Array<{ id: string; aVista: boolean; janela: Retangulo; seta: SetaLida | null; pontosVisiveis: number }>>(`IDS.map((id) => {
      const s = seta(id);
      // Nove pontos ao longo da seta, como na reprodução: visível onde nenhuma janela está por cima
      const pontos = s ? Array.from({ length: 9 }, (_, k) => s.caudaY + ((s.pontaY - s.caudaY) * (k + 1)) / 10) : [];
      const pontosVisiveis = pontos.filter((y) => !document.elementFromPoint(s.trilho, y)?.closest(".whispper-janela")).length;
      return { id, aVista: aVista(id), janela: desenhado(id), seta: s, pontosVisiveis };
    })`);

    const visiveis = leituras.filter((l) => l.aVista);
    assert.ok(visiveis.length > 0, "nenhuma janela à vista");
    for (const l of visiveis) {
      const balao = { id: `balão de ${l.id}`, x: 807, y: BALOES_ESTREITOS[Number(l.id.slice(1)) - 1]!, largura: 336, altura: 89 };
      assert.deepEqual(cruzamentos([l.janela, balao]), [], `a janela ${l.id} cobre o próprio balão: ${JSON.stringify(leituras)}`);
      assert.ok(l.seta && !l.seta.oculta && l.pontosVisiveis > 0, `a seta de ${l.id} não tem trecho visível: ${JSON.stringify(l)}`);
    }
  });

  await t.test("no modo abaixo, só a janela aberta por último fica à vista; destacar outra a põe à vista e oculta a anterior, e fechar a janela à vista não traz outra (TTLJ)", async () => {
    const p = await abrirPagina(TELA_ESTREITA);
    const leitura = await p.avaliar<{ aposAbrir: string[]; aposDestacar: string[]; setasAposDestacar: string[]; aposFechar: string[] }>(`(() => {
      const ids = ["D1", "D2", "D3"];
      const g = gerenciadorEstreito({ D1: 293, D2: 410, D3: 528 });
      for (const id of ids) g.abrir(id, "enviado");
      const visiveis = () => ids.filter(aVista);
      const setasVisiveis = () => ids.filter((id) => { const s = seta(id); return !!s && !s.oculta; });
      const aposAbrir = visiveis();
      // O clique no ícone de um áudio com janela aberta chega ao gerenciador como destacar
      g.destacar("D1");
      const aposDestacar = visiveis();
      const setasAposDestacar = setasVisiveis();
      g.fechar("D1");
      return { aposAbrir, aposDestacar, setasAposDestacar, aposFechar: visiveis() };
    })()`);

    assert.deepEqual(leitura.aposAbrir, ["D3"], `depois de abrir as três: ${JSON.stringify(leitura)}`);
    assert.deepEqual(leitura.aposDestacar, ["D1"], `depois de destacar a primeira: ${JSON.stringify(leitura)}`);
    assert.deepEqual(leitura.setasAposDestacar, ["D1"], `setas à vista depois de destacar a primeira: ${JSON.stringify(leitura)}`);
    assert.deepEqual(leitura.aposFechar, [], `depois de fechar a janela à vista: ${JSON.stringify(leitura)}`);
  });
});
