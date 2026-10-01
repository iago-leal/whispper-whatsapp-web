# Onboarding: Integração com WhatsApp Web

> Feature: `002-integracao-whatsapp-web`
> Data: 2026-10-01

## 1. Pré-requisitos
- Google Chrome instalado.
- Extensão construída (`cd extension && npm run build`).

## 2. Testes Automatizados
Execute a suíte de testes de DOM simulado e contratos do adaptador:
```bash
cd extension && npm test
```

## 3. Verificação Manual no WhatsApp Web
1. Abra `chrome://extensions/` no Chrome e clique em **Atualizar** na extensão Whispper.
2. Acesse `https://web.whatsapp.com` e abra qualquer conversa que possua mensagens de voz gravadas.
3. Observe que cada balão de áudio recebe um botão discreto de transcrição com o ícone do Whispper.
4. Verifique visualmente que o botão não sobrepõe a barra de reprodução e não distorce a altura do balão.
5. Abra o console do Chrome (`Cmd + Option + I`) e verifique que não há erros lançados pelo content script.
