import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";
const ID = "femjlfnijaboogbcdionddnjcjpfmieg";
const BASE = `chrome-extension://${ID}/dist`;
const log = (s: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
const prazo = <T>(p: Promise<T>, ms: number, oQue: string) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`prazo: ${oQue}`)), ms))]);
const perfil = mkdtempSync(join(tmpdir(), "whispper-sonda-"));
const nav = await Navegador.abrir(localizarNavegador()!, perfil, "/Users/iagoleal/dev/whispper-whatsapp-web/extension");
log("navegador aberto");
try {
  const pag = await prazo(nav.abrirPagina(`${BASE}/onboarding/index.html`), 15_000, "abrirPagina");
  log("página aberta");
  await pag.aguardar(`document.readyState === "complete"`, 10_000, "carga");
  log("carregada");
  const sonda = (arq: string, metodo: string) => prazo(pag.avaliar<string>(
    `Promise.race([fetch(${JSON.stringify(`${BASE}/instaladores/`)} + ${JSON.stringify(arq)}, {method: ${JSON.stringify(metodo)}}).then(r => "HTTP " + r.status + " ok=" + r.ok, e => "rejeitado: " + e.name + ": " + e.message), new Promise(r => setTimeout(() => r("sem resposta em 5 s"), 5000))])`), 10_000, `${metodo} ${arq}`);
  for (const m of ["HEAD", "GET"]) {
    log(`${m} .pkg existente: ${await sonda("whispper-macos-apple-silicon.pkg", m)}`);
    log(`${m} .exe ausente:   ${await sonda("whispper-windows-x64.exe", m)}`);
  }
  await prazo(pag.avaliar(`new Promise(r => chrome.storage.local.set({whispper_onboarding: {etapa: 3}}, r))`), 5_000, "storage.set");
  log("progresso gravado na etapa 3");
  await prazo(pag.avaliar(`setTimeout(() => location.reload(), 50), true`), 5_000, "reload");
  await new Promise(r => setTimeout(r, 2000));
  await pag.aguardar(`document.readyState === "complete" && getComputedStyle(document.getElementById("etapa-instalador")).display !== "none"`, 10_000, "etapa 3 restaurada");
  log(`retomada na etapa 3, href: ${await pag.avaliar<string>(`document.getElementById("link-download-instalador").href`)}`);
  log(`retomada na etapa 3, download: ${JSON.stringify(await pag.avaliar<string>(`document.getElementById("link-download-instalador").download`))}, target: ${await pag.avaliar<string>(`document.getElementById("link-download-instalador").target`)}`);
  log(`retomada na etapa 3, nome: ${await pag.avaliar<string>(`document.getElementById("nome-instalador").textContent`)}`);
} catch (e) { log(`ERRO ${(e as Error).message}`); }
finally { await prazo(nav.fechar(), 8_000, "fechar").catch(() => {}); rmSync(perfil, { recursive: true, force: true }); process.exit(0); }
