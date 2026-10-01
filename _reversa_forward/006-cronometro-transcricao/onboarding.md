# Onboarding: testar o indicador de espera com cronômetro

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`

## Pré-requisitos

- Aplicativo auxiliar instalado e o modelo baixado (painel da extensão mostra "Pronto").
- Node 24 ou superior, na pasta `extension/`.
- Chrome com a extensão carregada sem empacotamento a partir de `extension/`.

## 1. Testes automáticos

```bash
cd extension
npm run typecheck
npm test
```

Os testes de navegador rodam quando o Chrome for Testing está disponível (`npx playwright install chromium` ou `WHISPPER_E2E_NAVEGADOR`); sem ele, aparecem como pulados.

## 2. Montagem

```bash
cd extension
npm run build
```

Em `chrome://extensions`, recarregue a extensão e depois recarregue a aba do WhatsApp Web.

## 3. Ícone e janela durante a espera

1. Abra uma conversa com um áudio recebido de pelo menos 10 s que você ainda não transcreveu.
2. Clique no ícone de transcrição. Esperado: o ícone começa a pulsar de imediato e aparece "0 s" ao lado dele, avançando a cada segundo.
3. Olhe a janela flutuante. Esperado: "Transcrevendo… N s", com o mesmo valor do ícone.
4. Confira que o contador não cobre a duração do áudio ("0:13") nem o botão de reprodução.

## 4. Conclusão

1. Aguarde o texto. Esperado: o ícone para de pulsar e fica com a cor de concluído; a janela mostra "Transcrito em X,Y s · áudio de Z s".
2. Feche a janela e clique de novo no ícone. Esperado: a janela reabre com o mesmo resumo, sem contador.

## 5. Fila

1. Clique em três áudios seguidos.
2. Esperado: os três ícones pulsam; a janela do terceiro mostra "Na fila (N à frente) · N s".
3. Ao concluir, o resumo do terceiro mostra a parte da fila entre parênteses.

## 6. Casos de borda

1. Com um pedido em espera, troque de conversa e volte. Esperado: o ícone continua pulsando, com o tempo corrente.
2. Feche a janela durante a transcrição. Esperado: o ícone continua contando e passa a concluído no fim; clicar de novo mostra o resumo.
3. Com um pedido em espera, vá para outra aba por 2 min e volte. Esperado: o tempo exibido corresponde ao tempo real.
4. Com "Reduzir movimento" ligado nas preferências de acessibilidade do macOS, o ícone não pulsa, mas o contador avança.
5. Feche o aplicativo auxiliar e clique num áudio. Esperado: o ícone passa ao indicador de erro e a janela mostra "Falhou após N s"; "Tentar de novo" reinicia o contador em 0 s.

## 7. Painel

1. Abra o painel da extensão. Esperado: "Espera média: N,N s por minuto de áudio" depois de pelo menos uma transcrição de áudio recebido; antes disso, "Espera média: sem transcrições ainda".
2. Zere os contadores e confirme. Esperado: "Espera média: sem transcrições ainda" e a data atual; transcreva outro áudio e confira que a média volta a partir só dele.
