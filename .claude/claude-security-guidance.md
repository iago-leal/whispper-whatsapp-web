# Regras de segurança do whispper-whatsapp-web

- O texto transcrito é controlado por terceiros: qualquer contato do WhatsApp pode mandar uma mensagem
  de voz cuja transcrição contenha HTML ou texto que imite a interface. Ele só chega ao DOM por
  `textContent` ou equivalente. Aponte todo `innerHTML`, `insertAdjacentHTML` ou template string em HTML
  que possa carregar texto transcrito, detalhe de erro ou dado devolvido pelo host nativo (por exemplo,
  `requisito` e `explicacaoLeiga` em `extension/src/onboarding/onboarding.ts`).
- `extension/src/pagina/` roda no mundo MAIN da página, compartilhado com o WhatsApp Web e com scripts
  MAIN de outras extensões. Todo aperto de mão por `window.postMessage` confere origem e canal, e a
  `MessagePort` transferida só pode chegar ao script de conteúdo da extensão. Cada pedido pela porta é
  validado campo a campo.
- As mensagens com o host nativo (`extension/src/adaptadores/motor-local/`,
  `auxiliar/whispper_motor/protocolo.py`, `servidor.py`) seguem `contratos/protocolo-1.json`. Aponte
  falta de limite de tamanho, falta de checagem de tipo ou campo usado antes da validação, nos dois lados.
- Áudio e transcrição nunca saem da máquina: aponte qualquer `fetch`, `XMLHttpRequest`, `WebSocket`,
  telemetria ou chamada de rede que possa levá-los, e qualquer chave nova de `chrome.storage` que guarde
  texto transcrito além da sessão (LGPD).
- Dado pessoal nunca entra no git: as mensagens de voz reais de `amostras/reais/` e os prints, vídeos e
  registros do motor em `_reversa_bugs/` (`*.png`, `*.mov`, `*.tsv`).
- Os scripts de `auxiliar/` rodam na instalação, na conta do usuário: aponte variável sem aspas, caminho
  montado com entrada não confiável e qualquer acesso à rede.
