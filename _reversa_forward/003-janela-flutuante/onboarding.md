# Onboarding: Janela Flutuante

> Feature: `003-janela-flutuante`
> Data: 2026-10-01

## 1. Testes Automatizados
```bash
cd extension && npm test
```

## 2. Verificação no WhatsApp Web
1. Atualize a extensão em `chrome://extensions/`.
2. Acesse `https://web.whatsapp.com` e abra uma conversa com áudios.
3. Clique no botão de transcrição de uma mensagem.
4. Observe a abertura imediata da janela flutuante ancorada ao balão com cronômetro decorrido e estado de transcrição.
5. Quando o texto for retornado, teste a rolagem interna e o botão "Copiar".
6. Pressione `Esc` ou clique no `X` e verifique que a janela fecha suavemente.
