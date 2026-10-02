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
// só a mensagem carrega o data-id; o player fica sob o conteúdo virtualizado.
function painel(ids: string[], { comListaDeMensagens = true, comPlayer = true } = {}): string {
  const linhas = ids.map((id) =>
    `<div role="row"><div data-id="${id}" data-testid="conv-msg-${id}"><div data-virtualized="false">` +
    `<div data-testid="msg-container">${comPlayer ? PLAYER : ""}</div></div></div></div>`).join("");
  return comListaDeMensagens ? `<div data-tab="8" role="application">${linhas}</div>` : linhas;
}

function pagina(conversaAberta: string | null): string {
  const main = conversaAberta === null ? "" : `<div id="main">${conversaAberta}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head>` +
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
  // mesma tarefa em que o script executa, então a avaliação seguinte já o encontra inicializado.
  async function carregarWhatsApp(conversaAberta: string | null): Promise<Pagina> {
    const p = await navegador.abrirPagina("about:blank");
    await p.navegarSimulado(WHATSAPP, pagina(conversaAberta));
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
});
