// Extensão intrusa de teste (RF-14). Sem a key autorizada, seu identificador não consta do
// allowed_origins do aplicativo auxiliar, e o Chrome deve recusar a conexão sem iniciar o host,
// com o erro "Access to the specified native messaging host is forbidden."
// Para repetir a tentativa, rode tentarConectar() no console do service worker.

const NOME_DO_HOST = "whispper_whatsapp_web.motor";

function tentarConectar() {
  const porta = chrome.runtime.connectNative(NOME_DO_HOST);
  porta.onMessage.addListener((mensagem) => {
    console.error("[extensão intrusa] o host respondeu, portanto a conexão foi aceita:", mensagem);
  });
  porta.onDisconnect.addListener(() => {
    const erro = chrome.runtime.lastError?.message ?? "desconexão sem lastError";
    console.error(`[extensão intrusa] connectNative("${NOME_DO_HOST}") falhou: ${erro}`);
  });
  porta.postMessage({ tipo: "verificar", protocolo: 1 });
}

globalThis.tentarConectar = tentarConectar;
tentarConectar();
