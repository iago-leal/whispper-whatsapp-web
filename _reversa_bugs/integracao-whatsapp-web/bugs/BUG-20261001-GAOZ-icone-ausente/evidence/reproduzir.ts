// Reprodução isolada do BUG-20261001-GAOZ: Chrome for Testing com a extensão do HEAD e uma página
// falsa servida em https://web.whatsapp.com/ por interceptação do protocolo DevTools.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const EXT = process.argv[2]!;
const HTML_SEM_CONVERSA = `<!doctype html><html><head><meta charset="utf-8"><title>WhatsApp</title></head>
<body><div id="app"><div id="side"></div><div id="painel"></div></div></body></html>`;
const conversa = (ids: string[]) => `<div data-tab="8" role="application">${ids.map((id) =>
  `<div role="row"><div data-testid="conv-msg-${id}"><div data-testid="msg-container"><div>` +
  `<button aria-label="Reproduzir mensagem de voz"></button></div></div></div></div>`).join("")}</div>`;
const HTML_COM_CONVERSA = HTML_SEM_CONVERSA.replace('<div id="painel"></div>', `<div id="painel"><div id="main">${conversa(["A"])}</div></div>`);
const abrirConversa = (ids: string[]) => `(() => { document.querySelector('#main')?.remove();
  const m = document.createElement('div'); m.id = 'main'; m.innerHTML = ${JSON.stringify(conversa(ids))};
  document.querySelector('#painel').appendChild(m); })()`;
const icones = `document.querySelectorAll('#main .whispper-btn-transcrever').length`;

async function cenario(navegador: Navegador, html: string, nome: string, passos: (avaliar: (e: string) => Promise<any>) => Promise<void>) {
  const { targetId } = await navegador.enviar("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await navegador.enviar("Target.attachToTarget", { targetId, flatten: true });
  const avisos: string[] = [];
  navegador.ouvir((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === "Fetch.requestPaused") {
      void navegador.enviar("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
        body: Buffer.from(html).toString("base64") }, sessionId);
    }
    if (m.method === "Runtime.consoleAPICalled") avisos.push(m.params.args.map((a: any) => a.value ?? a.description ?? a.type).join(" "));
  });
  await navegador.enviar("Runtime.enable", {}, sessionId);
  await navegador.enviar("Page.enable", {}, sessionId);
  await navegador.enviar("Fetch.enable", { patterns: [{ urlPattern: "https://web.whatsapp.com/*", resourceType: "Document" }] }, sessionId);
  await navegador.enviar("Page.navigate", { url: "https://web.whatsapp.com/" }, sessionId);
  const avaliar = async (e: string) => (await navegador.enviar("Runtime.evaluate", { expression: e, returnByValue: true }, sessionId)).result.value;
  // document_idle: dá tempo de o script de conteúdo rodar
  const limite = Date.now() + 10_000;
  while ((await avaliar("document.readyState")) !== "complete" && Date.now() < limite) await esperar(100);
  await esperar(1500);
  console.log(`\n## ${nome}`);
  await passos(avaliar);
  console.log("console (whispper):", avisos.filter((a) => a.includes("Whispper")));
  await navegador.enviar("Target.closeTarget", { targetId });
}

const perfil = mkdtempSync(join(tmpdir(), "whispper-gaoz-"));
const navegador = await Navegador.abrir(localizarNavegador()!, perfil, EXT);
try {
  await cenario(navegador, HTML_SEM_CONVERSA, "S1 relatado: carrega sem conversa, depois abre conversa com áudio", async (avaliar) => {
    console.log("ícones antes de abrir:", await avaliar(`document.querySelectorAll('.whispper-btn-transcrever').length`));
    await avaliar(abrirConversa(["A"]));
    await esperar(500);
    console.log("ícones 500 ms após abrir a conversa A:", await avaliar(icones));
    await esperar(2000);
    console.log("ícones 2,5 s após abrir a conversa A:", await avaliar(icones));
  });
  await cenario(navegador, HTML_COM_CONVERSA, "S2 controle + troca: carrega COM conversa A aberta, depois troca para B", async (avaliar) => {
    console.log("ícones na conversa A (aberta no carregamento):", await avaliar(icones));
    await avaliar(abrirConversa(["B"]));
    await esperar(500);
    console.log("ícones 500 ms após trocar para B:", await avaliar(icones));
    await avaliar(abrirConversa(["A"]));
    await esperar(500);
    console.log("ícones 500 ms após voltar para A:", await avaliar(icones));
  });
} finally {
  await navegador.fechar();
  rmSync(perfil, { recursive: true, force: true });
}
