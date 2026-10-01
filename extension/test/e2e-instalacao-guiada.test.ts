// Ponta a ponta da instalação guiada no macOS (RF-07, BUG-20261001-MAC1): o Chrome for Testing
// carrega a extensão construída, a página de boas-vindas baixa o instalador embutido, o instalador
// registra o aplicativo auxiliar e a página segue sozinha até a transcrição de teste.
//
// Instala DE VERDADE na conta de quem roda, como o fluxo manual: grava
// ~/Library/Application Support/whispper-motor e o manifesto do host no Chrome, e os deixa
// instalados. Exige o modelo no cache local. Roda só com WHISPPER_E2E=1.
//
// O installer da linha de comando não passa pelo Gatekeeper: o aviso de pacote não assinado
// (RNF-03) continua sendo conferido à mão.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { setTimeout as esperar } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { localizarNavegador, Navegador } from "./suporte/navegador-cdp.ts";

const ID_DA_EXTENSAO = "femjlfnijaboogbcdionddnjcjpfmieg";
const EXTENSAO = fileURLToPath(new URL("..", import.meta.url));
const ARQUIVO = "whispper-macos-apple-silicon.pkg";
const EMBUTIDO = join(EXTENSAO, "dist", "instaladores", ARQUIVO);
const MANIFESTO_DO_HOST = join(
  homedir(), "Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts", "whispper_whatsapp_web.motor.json",
);
// A primeira transcrição carrega o modelo: com o disco frio, passa de um minuto.
const PRAZO_DA_TRANSCRICAO_MS = 240_000;

const visivel = (id: string) => `getComputedStyle(document.getElementById(${JSON.stringify(id)})).display !== "none"`;
const resumo = (caminho: string) => createHash("sha256").update(readFileSync(caminho)).digest("hex");

if (process.env.WHISPPER_E2E !== "1") {
  test("instalação guiada de ponta a ponta no macOS", {
    skip: "instala o aplicativo auxiliar na sua conta; rode com WHISPPER_E2E=1",
  });
} else {
  test("instalação guiada de ponta a ponta no macOS", { timeout: 600_000 }, async (t) => {
    const executavel = localizarNavegador();
    assert.ok(executavel, "Chrome for Testing não encontrado: rode npx playwright install chromium ou defina WHISPPER_E2E_NAVEGADOR");

    // O que se distribui: o build da extensão, que no macOS embute o instalador.
    execFileSync("npm", ["run", "build"], { cwd: EXTENSAO, stdio: "inherit" });

    const perfil = mkdtempSync(join(tmpdir(), "whispper-e2e-"));
    const downloads = join(perfil, "Downloads");
    mkdirSync(downloads);
    const navegador = await Navegador.abrir(executavel, perfil, EXTENSAO);
    t.after(async () => {
      await navegador.fechar();
      rmSync(perfil, { recursive: true, force: true });
    });
    await navegador.enviar("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads, eventsEnabled: true });

    const pagina = await navegador.abrirPagina(`chrome-extension://${ID_DA_EXTENSAO}/dist/onboarding/index.html`);
    // Os botões só respondem depois do DOMContentLoaded, quando o controlador os liga.
    await pagina.aguardar(`document.readyState === "complete" && ${visivel("etapa-privacidade")}`, 10_000, "a etapa 1 (privacidade)");
    await pagina.clicar("btn-aceitar-privacidade");
    await pagina.aguardar(visivel("resultado-compativel"), 10_000, "o computador ser aprovado na etapa 2");
    await pagina.clicar("btn-avancar-instalador");
    await pagina.aguardar(visivel("etapa-instalador"), 5_000, "a etapa 3 (aplicativo)");

    // Etapa 3: o botão precisa baixar o instalador embutido, byte a byte.
    let concluido = false;
    const pararDeOuvir = navegador.ouvir((m) => {
      if (m.method === "Browser.downloadProgress" && m.params.state === "completed") concluido = true;
    });
    await pagina.clicar("link-download-instalador");
    const limite = Date.now() + 30_000;
    while (!concluido) {
      assert.deepEqual(pagina.dialogos, [], "o botão de download abriu um diálogo em vez de baixar");
      assert.ok(Date.now() < limite, "o botão de download não baixou nada em 30 s");
      await esperar(250);
    }
    pararDeOuvir();
    const baixado = join(downloads, ARQUIVO);
    assert.equal(readFileSync(baixado).subarray(0, 4).toString("latin1"), "xar!", "o arquivo baixado não é um pacote do macOS");
    assert.equal(resumo(baixado), resumo(EMBUTIDO), "o arquivo baixado não é o instalador embutido na extensão");

    // O instalador, como o usuário o rodaria, sem senha de administrador.
    execFileSync("installer", ["-pkg", baixado, "-target", "CurrentUserHomeDirectory"], { stdio: "inherit" });
    // O Chrome procura hosts em ~/Library/Application Support/Google/Chrome/NativeMessagingHosts, onde o
    // instalador grava; o Chrome for Testing com perfil próprio, em <perfil>/NativeMessagingHosts.
    mkdirSync(join(perfil, "NativeMessagingHosts"), { recursive: true });
    copyFileSync(MANIFESTO_DO_HOST, join(perfil, "NativeMessagingHosts", basename(MANIFESTO_DO_HOST)));

    // A página consulta o motor a cada 3 s e avança sozinha quando ele responde.
    await pagina.aguardar(visivel("etapa-modelo"), 120_000, "a página detectar o aplicativo auxiliar (etapa 4)");
    await pagina.clicar("btn-avancar-teste");
    await pagina.aguardar(visivel("etapa-teste"), 5_000, "a etapa 5 (teste)");
    await pagina.clicar("btn-executar-teste");
    await pagina.aguardar(visivel("etapa-pronto"), PRAZO_DA_TRANSCRICAO_MS, "a transcrição de teste levar à etapa 6");
    const texto = await pagina.avaliar<string>(`document.getElementById("texto-resultado-teste").textContent`);
    assert.ok(texto.replace(/["\s]/g, "").length > 0, "a transcrição de teste veio vazia");
    assert.deepEqual(pagina.dialogos, []);
  });
}
