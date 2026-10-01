// Reprodução do BUG-20261001-RMLU: abre o popup que o manifesto declara e confere se o script roda.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as esperar } from "node:timers/promises";
import { localizarNavegador, Navegador } from "/Users/iagoleal/dev/whispper-whatsapp-web/extension/test/suporte/navegador-cdp.ts";

const ID = "femjlfnijaboogbcdionddnjcjpfmieg";
const EXTENSAO = "/Users/iagoleal/dev/whispper-whatsapp-web/extension";
const popup = process.argv[2] ?? JSON.parse(readFileSync(join(EXTENSAO, "manifest.json"), "utf8")).action.default_popup;
const perfil = mkdtempSync(join(tmpdir(), "whispper-rmlu-"));
const navegador = await Navegador.abrir(localizarNavegador()!, perfil, EXTENSAO);
try {
  const falhas: string[] = [];
  navegador.ouvir((m) => { if (m.method === "Network.loadingFailed") falhas.push(m.params.errorText); });
  const pagina = await navegador.abrirPagina(`chrome-extension://${ID}/${popup}`);
  await esperar(3000);
  const motor = await pagina.avaliar<string>(`document.getElementById("motor-status").textContent`);
  const integracao = await pagina.avaliar<string>(`document.getElementById("integracao-status").textContent`);
  const recursos = await pagina.avaliar<string[]>(`performance.getEntriesByType("resource").map(r => r.name + " " + r.responseStatus)`);
  console.log("default_popup:", popup);
  console.log("motor-status:", motor);
  console.log("integracao-status:", integracao);
  console.log("recursos:", recursos);
  const antes = new Set((await navegador.enviar("Target.getTargets")).targetInfos.map((t: any) => t.targetId));
  await pagina.clicar("btn-verificar-compatibilidade");
  await esperar(1500);
  const { targetInfos } = await navegador.enviar("Target.getTargets");
  console.log("abas novas após o clique:", targetInfos.filter((t: any) => t.type === "page" && !antes.has(t.targetId)).map((t: any) => t.url));
} finally {
  await navegador.fechar();
  rmSync(perfil, { recursive: true, force: true });
}
