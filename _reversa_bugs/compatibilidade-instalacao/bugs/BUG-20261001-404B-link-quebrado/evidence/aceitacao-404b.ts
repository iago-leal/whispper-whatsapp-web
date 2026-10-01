// Aceitação do BUG-20261001-404B no Chrome for Testing (roteiro de repro-404b.ts + botão e "Tentar de novo"): não instala nada.
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const ID = "femjlfnijaboogbcdionddnjcjpfmieg";
const EXT = "/Users/iagoleal/dev/whispper-whatsapp-web/extension";
const URL_ONB = `chrome-extension://${ID}/dist/onboarding/index.html`;
const vis = (id: string) => `getComputedStyle(document.getElementById(${JSON.stringify(id)})).display !== "none"`;

async function cenario(nome: string, ua?: { userAgent: string; platform: string }) {
  const perfil = mkdtempSync(join(tmpdir(), "whispper-404b-"));
  const downloads = join(perfil, "Downloads");
  mkdirSync(downloads);
  const nav = await Navegador.abrir(localizarNavegador()!, perfil, EXT);
  try {
    await nav.enviar("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads, eventsEnabled: true });
    const eventos: string[] = [];
    nav.ouvir((m) => {
      if (m.method === "Browser.downloadWillBegin") eventos.push(`willBegin ${m.params.url} -> ${m.params.suggestedFilename}`);
      if (m.method === "Browser.downloadProgress" && m.params.state !== "inProgress") eventos.push(`progress ${m.params.state}`);
    });
    const pag = await nav.abrirPagina("about:blank");
    const sessao = (pag as any).sessao;
    if (ua) await nav.enviar("Emulation.setUserAgentOverride", ua, sessao);
    await nav.enviar("Page.navigate", { url: URL_ONB }, sessao);
    await pag.aguardar(`document.readyState === "complete" && ${vis("etapa-privacidade")}`, 10_000, "etapa 1");
    await pag.clicar("btn-aceitar-privacidade");
    await pag.aguardar(vis("resultado-compativel"), 10_000, "etapa 2 compatível");
    await pag.clicar("btn-avancar-instalador");
    await pag.aguardar(vis("etapa-instalador"), 5_000, "etapa 3");
    const href = await pag.avaliar<string>(`document.getElementById("link-download-instalador").href`);
    const nomeInst = await pag.avaliar<string>(`document.getElementById("nome-instalador").textContent`);
    const recurso = await pag.avaliar<string>(
      `fetch(document.getElementById("link-download-instalador").href).then(r => "HTTP " + r.status + ", " + r.headers.get("content-length") + " bytes", e => "fetch rejeitado: " + e.message)`,
    );
    await esperar(500);
    const botaoVisivel = await pag.avaliar<boolean>(`getComputedStyle(document.getElementById("link-download-instalador")).display !== "none"`);
    const alertaVisivel = await pag.avaliar<boolean>(`getComputedStyle(document.getElementById("erro-download-instalador")).display !== "none"`);
    if (botaoVisivel) await pag.clicar("link-download-instalador");
    else await pag.clicar("btn-tentar-download");
    await esperar(4_000);
    const alertaDepois = await pag.avaliar<boolean>(`getComputedStyle(document.getElementById("erro-download-instalador")).display !== "none"`);
    const textoEtapa = await pag.avaliar<string>(`document.getElementById("etapa-instalador").innerText`);
    console.log(`\n=== ${nome} ===`);
    console.log(`navigator.platform: ${await pag.avaliar<string>("navigator.platform")}`);
    console.log(`instalador sugerido: ${nomeInst}`);
    console.log(`href do botão: ${href}`);
    console.log(`aponta para github.com: ${href.includes("github.com")}`);
    console.log(`recurso do href: ${recurso}`);
    console.log(`eventos de download: ${JSON.stringify(eventos)}`);
    console.log(`arquivos em Downloads: ${JSON.stringify(readdirSync(downloads))}`);
    console.log(`botão de download visível: ${botaoVisivel}; alerta de falha visível: ${alertaVisivel}`);
    console.log(`clique em: ${botaoVisivel ? "Baixar Instalador" : "Tentar de novo"}; alerta depois do clique: ${alertaDepois}`);
    console.log(`diálogos: ${JSON.stringify(pag.dialogos)}`);
    console.log(`etapa 3 menciona falha/"Tentar de novo": ${/tentar de novo|não foi possível/i.test(textoEtapa)}`);
    console.log(`texto da etapa 3: ${JSON.stringify(textoEtapa.replace(/\s+/g, " ").trim())}`);
  } finally {
    await nav.fechar();
    rmSync(perfil, { recursive: true, force: true });
  }
}

await cenario("A: macOS (UA nativo do Chrome for Testing)");
await cenario("B: Windows 64 bits (UA emulado)", {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  platform: "Win32",
});
