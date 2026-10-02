// Integração com a conversa aberta, no navegador (BUG-20261001-GAOZ): o Chrome for Testing carrega
// a extensão montada a partir do código-fonte, e uma página falsa responde no lugar de
// web.whatsapp.com com a estrutura de conversa inspecionada no WhatsApp Web em 2026-10-01
// (evidence/conferencia-whatsapp-real.md do bug). O WhatsApp sempre carrega sem conversa aberta,
// troca o painel #main a cada conversa e monta o player de voz depois do balão, dentro dele; é essa
// sequência que os testes repetem.
//
// Sem rede, sem conta e sem efeito fora do diretório temporário. Pulado sem o Chrome for Testing.

import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as esperar } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { localizarNavegador, Navegador, type Pagina } from "./suporte/navegador-cdp.ts";

const EXTENSAO = fileURLToPath(new URL("..", import.meta.url));
const NOME_DA_EXTENSAO = "whispper-whatsapp-web";
const WHATSAPP = "https://web.whatsapp.com/";

const PLAYER = `<div><button aria-label="Reproduzir mensagem de voz"></button></div>`;

// Balões de voz como no DOM real: a linha e a mensagem aninhada casam ambas o seletor de balão, e
// só a mensagem carrega o data-id; o player fica sob o conteúdo virtualizado. A lista rolável tem
// altura própria e espaço abaixo das mensagens, como a do WhatsApp.
function painel(ids: string[], { comListaDeMensagens = true, comPlayer = true, rolavel = false } = {}): string {
  const linhas = ids.map((id) =>
    `<div role="row"><div data-id="${id}" data-testid="conv-msg-${id}"><div data-virtualized="false">` +
    `<div data-testid="msg-container">${comPlayer ? PLAYER : ""}</div></div></div></div>`).join("");
  const lista = rolavel
    ? `<div data-tab="8" role="application" style="height:300px;overflow-y:auto">${linhas}<div style="height:2000px"></div></div>`
    : `<div data-tab="8" role="application">${linhas}</div>`;
  return comListaDeMensagens ? lista : linhas;
}

// Áudios na geometria conferida no WhatsApp Web real em 2026-10-02 (BUG-20261002-A4MZ,
// evidence/conferencia-whatsapp-real.md): a linha e a mensagem ocupam a largura da área da conversa, e o
// balão visível (msg-container), de 336 px, fica colado à esquerda nos recebidos e à direita nos
// enviados. Um espaço separa os dois áudios, para a janela de um não empurrar a do outro (K3DY).
function conversaComGeometriaReal(): string {
  const linha = (id: string, alinhamento: string) =>
    `<div role="row"><div data-id="${id}" data-testid="conv-msg-${id}"><div data-virtualized="false">` +
    `<div style="display:flex;flex-direction:column;align-items:${alinhamento};padding:6px 57px 6px 62px">` +
    `<div data-testid="msg-container" style="width:336px;height:62px">${PLAYER}</div></div></div></div></div>`;
  return `<div data-tab="8" role="application" style="padding-top:60px">` +
    linha("R", "flex-start") + `<div style="height:240px"></div>` + linha("E", "flex-end") + `</div>`;
}

// Tela do navegador e largura da lista de conversas, que ocupa a esquerda; a área da conversa fica com o resto.
interface Tela {
  largura: number;
  altura: number;
  lista: number;
}

function pagina(conversaAberta: string | null, tela?: Tela): string {
  const main = conversaAberta === null ? "" : `<div id="main">${conversaAberta}</div>`;
  const estilo = tela
    ? `<style>body{margin:0}#app{display:flex;height:100vh}#side{flex:none;width:${tela.lista}px}#painel{flex:1;min-width:0}</style>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title>${estilo}</head>` +
    `<body><div id="app"><div id="side"></div><div id="painel">${main}</div></div></body></html>`;
}

// Troca o #main inteiro, como o WhatsApp faz, e resolve com os ms até o primeiro ícone na conversa
// nova, ou null se nenhum aparecer em 2 s.
const abrirConversa = (html: string) => `new Promise((resolver) => {
  document.querySelector("#main")?.remove();
  const main = document.createElement("div");
  main.id = "main";
  main.innerHTML = ${JSON.stringify(html)};
  const inicio = performance.now();
  const observador = new MutationObserver(() => {
    if (main.querySelector(".whispper-btn-transcrever")) { observador.disconnect(); resolver(performance.now() - inicio); }
  });
  observador.observe(main, { childList: true, subtree: true });
  setTimeout(() => { observador.disconnect(); resolver(null); }, 2000);
  document.querySelector("#painel").appendChild(main);
})`;

// Monta o player dentro de uma mensagem já exibida, como a virtualização do WhatsApp faz, e resolve
// com os ms até o ícone aparecer nela, ou null se não aparecer em 2 s.
const montarPlayer = (id: string) => `new Promise((resolver) => {
  const mensagem = document.querySelector('[data-testid="conv-msg-${id}"]');
  const inicio = performance.now();
  const observador = new MutationObserver(() => {
    if (mensagem.querySelector(".whispper-btn-transcrever")) { observador.disconnect(); resolver(performance.now() - inicio); }
  });
  observador.observe(mensagem, { childList: true, subtree: true });
  setTimeout(() => { observador.disconnect(); resolver(null); }, 2000);
  mensagem.querySelector('[data-testid="msg-container"]').insertAdjacentHTML("beforeend", ${JSON.stringify(PLAYER)});
})`;

const iconesPorMensagem = `[...document.querySelectorAll('#main [role="row"]')]
  .map((linha) => linha.querySelectorAll(".whispper-btn-transcrever").length)`;

// O ícone leva o identificador da mensagem (RF-04): o data-id do balão em que entrou.
const idsDosIcones = `[...document.querySelectorAll("#main .whispper-btn-transcrever")].map((icone) => icone.getAttribute("data-id"))`;

const avisosDeDegradacao = (p: Pagina) => p.console.filter((linha) => linha.includes("degradado"));

// Leitura do ícone de uma mensagem como o usuário o vê (feature 006): estado, pulsar, rótulo e contador.
interface LeituraDoIcone {
  ms: number;
  estado: string | null;
  pulsando: boolean;
  animacao: string;
  rotulo: string | null;
  contador: string;
  contadorVisivel: boolean;
}

const lerIcone = `(botao, inicio) => {
  const contador = botao.querySelector(".whispper-contador");
  return {
    ms: Math.round(performance.now() - inicio),
    estado: botao.getAttribute("data-whispper-estado"),
    pulsando: botao.classList.contains("whispper-animando"),
    animacao: getComputedStyle(botao.querySelector(".whispper-icone")).animationName,
    rotulo: botao.getAttribute("aria-label"),
    contador: contador.textContent,
    contadorVisivel: getComputedStyle(contador).display !== "none",
  };
}`;

// Clica no ícone da mensagem e acompanha o botão até o indicador de erro. Devolve as leituras
// distintas, a primeira feita na mesma tarefa do clique, antes de qualquer resposta do motor, ou
// null se o erro não vier em 15 s (o prazo de verificação do motor é de 10 s).
const clicarEAcompanhar = (id: string) => `new Promise((resolver) => {
  const ler = ${lerIcone};
  const botao = document.querySelector('#main .whispper-btn-transcrever[data-id="${id}"]');
  const leituras = [];
  let inicio = 0;
  const anotar = () => {
    const leitura = ler(botao, inicio);
    const anterior = leituras.at(-1);
    if (!anterior || ["estado", "pulsando", "rotulo", "contador"].some((campo) => anterior[campo] !== leitura[campo])) leituras.push(leitura);
    if (leitura.estado === "erro") { observador.disconnect(); resolver(leituras); }
  };
  const observador = new MutationObserver(anotar);
  observador.observe(botao, { attributes: true, childList: true, characterData: true, subtree: true });
  setTimeout(() => { observador.disconnect(); resolver(null); }, 15000);
  inicio = performance.now();
  botao.click();
  anotar();
})`;

// Clica no ícone e devolve a leitura feita na mesma tarefa do clique.
const clicar = (id: string) => `(() => {
  const botao = document.querySelector('#main .whispper-btn-transcrever[data-id="${id}"]');
  const inicio = performance.now();
  botao.click();
  return (${lerIcone})(botao, inicio);
})()`;

// Resolve quando todos os ícones da conversa estiverem no indicador de erro, ou em 15 s.
const todosEmErro = `new Promise((resolver) => {
  const limite = performance.now() + 15000;
  const conferir = () => {
    const estados = [...document.querySelectorAll("#main .whispper-btn-transcrever")].map((b) => b.getAttribute("data-whispper-estado"));
    if (estados.every((estado) => estado === "erro") || performance.now() > limite) resolver(estados);
    else setTimeout(conferir, 50);
  };
  conferir();
})`;

const FORMATO_DO_CONTADOR = /^\d+ s$/;

// Leitura da janela de um áudio como o usuário a vê (BUG-20261002-IXWO). Visível: sem a classe que
// a oculta, com a posição aplicada e dentro da tela. Junto ao balão: a 8 px do balão visível
// (msg-container), à direita ou à esquerda com os topos alinhados, ou logo abaixo (RF-01 e RF-02 da
// janela), com tolerância de 4 px. A linha da mensagem não serve de medida: ocupa a largura da conversa
// (BUG-20261002-A4MZ). Cobre a lista: o retângulo da janela cruza o da lista de conversas.
interface LeituraDaJanela {
  existe: boolean;
  visivel: boolean;
  junto: "direita" | "esquerda" | "abaixo" | null;
  cobreLista: boolean;
  texto: string;
}

const lerJanela = `(id) => {
  const janela = document.querySelector('.whispper-janela[aria-label="Transcrição do áudio ' + id + '"]');
  if (!janela) return { existe: false, visivel: false, junto: null, cobreLista: false, texto: "" };
  const j = janela.getBoundingClientRect();
  const b = document.querySelector('#main [data-id="' + id + '"] [data-testid="msg-container"]').getBoundingClientRect();
  const l = document.querySelector("#side").getBoundingClientRect();
  const perto = (a, c) => Math.abs(a - c) <= 4;
  const junto = perto(j.top, b.top) && perto(j.left, b.right + 8) ? "direita"
    : perto(j.top, b.top) && perto(j.right, b.left - 8) ? "esquerda"
    : perto(j.top, b.bottom + 8) ? "abaixo" : null;
  return {
    existe: true,
    visivel: !janela.classList.contains("whispper-janela-oculta") && janela.style.transform !== "" && j.bottom > 0 && j.top < innerHeight,
    junto,
    cobreLista: j.left < l.right && j.right > l.left && j.top < l.bottom && j.bottom > l.top,
    texto: janela.innerText,
  };
}`;

const janelaJuntoAoBalao = (id: string) => `(() => { const j = (${lerJanela})("${id}"); return j.visivel && j.junto !== null; })()`;

// Clica no ícone e acompanha a janela do áudio até o ícone indicar erro. Devolve as leituras
// distintas da janela, cada uma com o estado do ícone no mesmo instante e a primeira feita na mesma
// tarefa do clique, ou null se o erro não vier em 15 s.
const clicarEAcompanharJanela = (id: string) => `new Promise((resolver) => {
  const ler = ${lerJanela};
  const botao = document.querySelector('#main .whispper-btn-transcrever[data-id="${id}"]');
  const leituras = [];
  let inicio = 0;
  const anotar = () => {
    const leitura = { ms: Math.round(performance.now() - inicio), icone: botao.getAttribute("data-whispper-estado"), ...ler("${id}") };
    const anterior = leituras.at(-1);
    if (!anterior || ["icone", "visivel", "junto", "texto"].some((campo) => anterior[campo] !== leitura[campo])) leituras.push(leitura);
    if (leitura.icone === "erro") { observador.disconnect(); resolver(leituras); }
  };
  const observador = new MutationObserver(anotar);
  observador.observe(document.body, { attributes: true, childList: true, characterData: true, subtree: true });
  setTimeout(() => { observador.disconnect(); resolver(null); }, 15000);
  inicio = performance.now();
  botao.click();
  anotar();
})`;

async function montarExtensao(destino: string): Promise<void> {
  mkdirSync(join(destino, "dist", "content"), { recursive: true });
  copyFileSync(join(EXTENSAO, "manifest.json"), join(destino, "manifest.json"));
  await build({
    entryPoints: [join(EXTENSAO, "src", "content", "index.ts")],
    bundle: true, format: "iife", outfile: join(destino, "dist", "content", "index.js"), logLevel: "warning",
  });
  // O script do mundo da página que o manifesto declara (BUG-20261001-2MOY): sem ele, o Chrome recusa a extensão.
  await build({
    entryPoints: [join(EXTENSAO, "src", "pagina", "ponte-audio.ts")],
    bundle: true, format: "iife", outfile: join(destino, "dist", "pagina", "ponte-audio.js"), logLevel: "warning",
  });
  await build({
    entryPoints: [join(EXTENSAO, "src", "background.ts")],
    bundle: true, format: "esm", outfile: join(destino, "dist", "background.js"), logLevel: "warning",
  });
  for (const css of ["estilos.css", "janela-flutuante.css"]) {
    copyFileSync(join(EXTENSAO, "src", "content", css), join(destino, "dist", "content", css));
  }
}

const executavel = localizarNavegador();

test("integração com a conversa aberta no WhatsApp Web", {
  skip: executavel ? false : "Chrome for Testing não encontrado: rode npx playwright install chromium ou defina WHISPPER_E2E_NAVEGADOR",
  timeout: 120_000,
}, async (t) => {
  const raiz = mkdtempSync(join(tmpdir(), "whispper-conversa-"));
  const extensao = join(raiz, "extensao");
  await montarExtensao(extensao);
  const navegador = await Navegador.abrir(executavel!, join(raiz, "perfil"), extensao);
  t.after(async () => {
    await navegador.fechar();
    rmSync(raiz, { recursive: true, force: true });
  });

  // Devolve a página depois que o script de conteúdo rodou: o mundo isolado da extensão nasce na
  // mesma tarefa em que o script executa, então a avaliação seguinte já o encontra inicializado. Com a
  // tela, fixa o tamanho antes de carregar e põe a lista de conversas ao lado da conversa.
  async function carregarWhatsApp(conversaAberta: string | null, tela?: Tela): Promise<Pagina> {
    const p = await navegador.abrirPagina("about:blank");
    if (tela) await p.definirTamanho(tela.largura, tela.altura);
    await p.navegarSimulado(WHATSAPP, pagina(conversaAberta, tela));
    const limite = Date.now() + 10_000;
    while (!p.mundosIsolados.includes(NOME_DA_EXTENSAO)) {
      assert.ok(Date.now() < limite, "o script de conteúdo não entrou na página em 10 s");
      await esperar(50);
    }
    await p.avaliar("0");
    return p;
  }

  await t.test("reprodução: a página carrega sem conversa e o ícone aparece em até 500 ms quando a conversa abre (RF-01, RF-03)", async () => {
    const p = await carregarWhatsApp(null);
    const ms = await p.avaliar<number | null>(abrirConversa(painel(["A"])));
    assert.notEqual(ms, null, `nenhum ícone em 2 s depois de abrir a conversa; console: ${JSON.stringify(p.console)}`);
    assert.ok(ms! <= 500, `o ícone levou ${ms} ms`);
    assert.deepEqual(await p.avaliar(iconesPorMensagem), [1]);
    assert.deepEqual(await p.avaliar(idsDosIcones), ["A"]);
  });

  await t.test("reprodução no WhatsApp real: o player montado depois do balão recebe o ícone em até 500 ms (RF-01, RF-03)", async () => {
    const p = await carregarWhatsApp(null);
    assert.equal(await p.avaliar(abrirConversa(painel(["A", "B"], { comPlayer: false }))), null, "ícone em mensagem sem player de voz");
    const ms = await p.avaliar<number | null>(montarPlayer("B"));
    assert.notEqual(ms, null, "o player montado depois do balão ficou sem ícone");
    assert.ok(ms! <= 500, `o ícone levou ${ms} ms`);
    assert.deepEqual(await p.avaliar(iconesPorMensagem), [0, 1]);
    assert.deepEqual(await p.avaliar(idsDosIcones), ["B"]);
  });

  await t.test("trocar de conversa e voltar mantém exatamente um ícone por mensagem de voz (RF-02, RF-11)", async () => {
    const p = await carregarWhatsApp(painel(["A"]));
    assert.deepEqual(await p.avaliar(iconesPorMensagem), [1], "a conversa aberta no carregamento ficou sem ícone");
    for (const [conversa, ids] of [["B", ["B1", "B2"]], ["A de volta", ["A"]]] as const) {
      const ms = await p.avaliar<number | null>(abrirConversa(painel([...ids])));
      assert.notEqual(ms, null, `a conversa ${conversa} ficou sem ícone`);
      assert.ok(ms! <= 500, `na conversa ${conversa}, o ícone levou ${ms} ms`);
      assert.deepEqual(await p.avaliar(iconesPorMensagem), ids.map(() => 1), `ícones por mensagem na conversa ${conversa}`);
      assert.deepEqual(await p.avaliar(idsDosIcones), [...ids], `identificadores na conversa ${conversa}`);
    }
  });

  await t.test("sem conversa aberta não há aviso de degradação (EC-10)", async () => {
    const p = await carregarWhatsApp(null);
    assert.deepEqual(avisosDeDegradacao(p), []);
  });

  await t.test("conversa sem a lista de mensagens fica degradada e sem ícone, e a seguinte volta a receber (RF-11, RF-12)", async () => {
    const p = await carregarWhatsApp(null);
    assert.equal(await p.avaliar(abrirConversa(painel(["A"], { comListaDeMensagens: false }))), null, "inseriu ícone em estado degradado");
    assert.equal(avisosDeDegradacao(p).length, 1, `avisos: ${JSON.stringify(p.console)}`);
    assert.match(avisosDeDegradacao(p)[0]!, /containerMensagens/);
    const ms = await p.avaliar<number | null>(abrirConversa(painel(["B"])));
    assert.notEqual(ms, null, "a conversa íntegra seguinte ficou sem ícone");
  });

  // Feature 006: o pedido acaba em erro qualquer que seja o motor da máquina, porque, se o aplicativo
  // auxiliar responder no perfil temporário, a página falsa não tem o áudio para entregar.
  await t.test("o clique faz o ícone pulsar com contador e, sem motor, passa ao erro sem contador (RF-01, RF-02 da feature 006)", async () => {
    const p = await carregarWhatsApp(painel(["A"]));
    const leituras = await p.avaliar<LeituraDoIcone[] | null>(clicarEAcompanhar("A"));
    assert.notEqual(leituras, null, `o ícone não chegou ao indicador de erro em 15 s; console: ${JSON.stringify(p.console)}`);

    const [primeira] = leituras!;
    assert.ok(primeira!.pulsando && primeira!.estado === "transcrevendo", `o clique não fez o ícone pulsar: ${JSON.stringify(primeira)}`);
    assert.ok(primeira!.ms <= 100, `o ícone levou ${primeira!.ms} ms para pulsar`);
    assert.equal(primeira!.rotulo, "Transcrevendo áudio");
    assert.equal(primeira!.animacao, "whispper-pulsar", "a classe de espera não aplicou a animação da folha de estilos");
    assert.ok(primeira!.contadorVisivel, "o contador ficou oculto durante a espera");

    const emEspera = leituras!.filter((leitura) => leitura.estado === "transcrevendo");
    for (const leitura of emEspera) {
      assert.match(leitura.contador, FORMATO_DO_CONTADOR, `contador fora do formato "7 s": ${JSON.stringify(leitura)}`);
    }

    const ultima = leituras!.at(-1)!;
    assert.equal(ultima.estado, "erro");
    assert.equal(ultima.rotulo, "Erro na transcrição");
    assert.equal(ultima.pulsando, false);
    assert.equal(ultima.animacao, "none", "o ícone continuou pulsando no erro");
    assert.equal(ultima.contador, "", "o contador ficou no ícone em erro");
    assert.equal(ultima.contadorVisivel, false);
  });

  await t.test("em 20 cliques, ao menos 95% dos ícones pulsam em até 100 ms (RF-01 da feature 006)", async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `V${i + 1}`);
    const p = await carregarWhatsApp(painel(ids));
    const leituras: LeituraDoIcone[] = [];
    for (const id of ids) leituras.push(await p.avaliar<LeituraDoIcone>(clicar(id)));

    const naoPulsaram = ids.filter((_, i) => !leituras[i]!.pulsando);
    assert.deepEqual(naoPulsaram, [], "ícones que não pulsaram na mesma tarefa do clique");
    const lentos = leituras.filter((leitura) => leitura.ms > 100);
    assert.ok(lentos.length <= 1, `ícones acima de 100 ms: ${JSON.stringify(lentos.map((leitura) => leitura.ms))}`);
    for (const leitura of leituras) assert.match(leitura.contador, FORMATO_DO_CONTADOR);

    const estados = await p.avaliar<string[]>(todosEmErro);
    assert.deepEqual(estados, ids.map(() => "erro"), "pedidos que não terminaram no indicador de erro");
  });

  // BUG-20261002-IXWO: a janela nascia sem âncora e só aparecia na primeira rolagem. A aba vai para o
  // primeiro plano, como a do usuário: em segundo plano a página não dispara scroll nem resize, e o
  // teste não separaria a falta de rolagem da falta de quadros.
  await t.test("reprodução: sem rolagem, a janela fica visível junto ao balão em até 150 ms do clique e mostra o erro quando o ícone o indica (RF-01, RF-06 e RNF-01 da janela)", async () => {
    const p = await carregarWhatsApp(painel(["A"]));
    await p.trazerParaFrente();
    const leituras = await p.avaliar<Array<LeituraDaJanela & { ms: number; icone: string | null }> | null>(clicarEAcompanharJanela("A"));
    assert.notEqual(leituras, null, `o ícone não chegou ao indicador de erro em 15 s; console: ${JSON.stringify(p.console)}`);

    const primeiraVisivel = leituras!.findIndex((leitura) => leitura.visivel);
    assert.notEqual(primeiraVisivel, -1, `a janela não ficou visível sem rolagem: ${JSON.stringify(leituras)}`);
    const aberta = leituras![primeiraVisivel]!;
    assert.ok(aberta.ms <= 150, `a janela levou ${aberta.ms} ms para ficar visível`);
    assert.match(aberta.texto, /na fila|transcrevendo/i, "a janela não mostrou a espera antes do erro");

    // Do primeiro instante ao erro, em todos os estados, a janela fica visível e junto ao balão
    for (const leitura of leituras!.slice(primeiraVisivel)) {
      assert.ok(leitura.visivel, `a janela sumiu sem rolagem: ${JSON.stringify(leitura)}`);
      assert.notEqual(leitura.junto, null, `a janela ficou longe do balão: ${JSON.stringify(leitura)}`);
    }

    // O ícone indica o erro no mesmo instante em que o erro está legível na janela
    const noErro = leituras!.at(-1)!;
    assert.ok(noErro.visivel, "o ícone indicou erro com a janela oculta");
    assert.match(noErro.texto, /erro/i);
    assert.match(noErro.texto, /tentar de novo/i);
  });

  // RF-03 da janela: a rolagem continua levando a janela junto ao balão depois que a abertura passou
  // a ler a âncora (BUG-20261002-IXWO). Rolar exige a aba em primeiro plano.
  await t.test("rolar a conversa leva a janela junto, oculta-a com o balão fora da tela e a reexibe com o mesmo texto ao voltar (RF-03 da janela)", async () => {
    const p = await carregarWhatsApp(painel(["A"], { rolavel: true }));
    await p.trazerParaFrente();
    await p.avaliar(clicar("A"));
    assert.deepEqual(await p.avaliar(todosEmErro), ["erro"], "o pedido não terminou no indicador de erro");
    const rolarPara = (topo: number) => p.avaliar(`document.querySelector('#main [role="application"]').scrollTop = ${topo}`);
    const lerA = () => p.avaliar<LeituraDaJanela>(`(${lerJanela})("A")`);

    await rolarPara(10);
    await p.aguardar(janelaJuntoAoBalao("A"), 2000, "a janela acompanhar o balão na rolagem");
    const texto = (await lerA()).texto;

    await rolarPara(1000);
    await p.aguardar(`!(${lerJanela})("A").visivel`, 2000, "a janela se ocultar com o balão fora da tela");

    await rolarPara(0);
    await p.aguardar(janelaJuntoAoBalao("A"), 2000, "a janela reaparecer junto ao balão");
    assert.equal((await lerA()).texto, texto, "a janela voltou com outro conteúdo");
  });

  // BUG-20261002-A4MZ: a âncora media a linha da mensagem, da largura da conversa, e o espaço livre era
  // contado da borda da tela; a janela abria à esquerda da linha, sobre a lista de conversas (x = 160 no
  // print). Tela e lista com as medidas do print do relato.
  await t.test("reprodução: na geometria do WhatsApp real, a janela abre ao lado do balão visível, dentro da área da conversa: à direita do recebido e à esquerda do enviado (RF-01 da janela)", async () => {
    const p = await carregarWhatsApp(conversaComGeometriaReal(), { largura: 1316, altura: 806, lista: 488 });
    await p.trazerParaFrente();
    const lerJanelaDe = (id: string) => p.avaliar<LeituraDaJanela>(`(${lerJanela})("${id}")`);

    await p.avaliar(clicar("R"));
    await p.aguardar(`(${lerJanela})("R").visivel`, 2000, "a janela do áudio recebido ficar visível");
    const recebido = await lerJanelaDe("R");
    assert.equal(recebido.junto, "direita", `a janela do recebido não abriu à direita do balão: ${JSON.stringify(recebido)}`);
    assert.equal(recebido.cobreLista, false, "a janela do recebido cobre a lista de conversas");

    await p.avaliar(clicar("E"));
    await p.aguardar(`(${lerJanela})("E").visivel`, 2000, "a janela do áudio enviado ficar visível");
    const enviado = await lerJanelaDe("E");
    assert.equal(enviado.junto, "esquerda", `a janela do enviado não abriu à esquerda do balão: ${JSON.stringify(enviado)}`);
    assert.equal(enviado.cobreLista, false, "a janela do enviado cobre a lista de conversas");
  });

  // RF-02 da janela: sem espaço ao lado do balão dentro da área da conversa, a janela abre abaixo dele.
  // Na área de 600 px do critério de aceite, o espaço que a tela teria à esquerda é o da lista.
  await t.test("com a área da conversa reduzida a 600 px, a janela abre abaixo do balão, sem cobri-lo nem cobrir a lista de conversas (RF-02 da janela)", async () => {
    const p = await carregarWhatsApp(conversaComGeometriaReal(), { largura: 488 + 600, altura: 806, lista: 488 });
    await p.trazerParaFrente();

    for (const id of ["R", "E"]) {
      await p.avaliar(clicar(id));
      await p.aguardar(`(${lerJanela})("${id}").visivel`, 2000, `a janela do áudio ${id} ficar visível`);
      const leitura = await p.avaliar<LeituraDaJanela>(`(${lerJanela})("${id}")`);
      assert.equal(leitura.junto, "abaixo", `a janela do áudio ${id} não abriu abaixo do balão: ${JSON.stringify(leitura)}`);
      assert.equal(leitura.cobreLista, false, `a janela do áudio ${id} cobre a lista de conversas`);
    }
  });
});
