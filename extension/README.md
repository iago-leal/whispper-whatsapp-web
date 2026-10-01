# Extensão (whispper-whatsapp-web)

Extensão mínima do Chrome, em Manifest V3 e sem interface. O service worker hospeda o adaptador do motor local, que fala com o aplicativo auxiliar por Native Messaging, e expõe ao console o objeto `motorDiagnostico`. Requer Node 24 ou superior para o build e os testes, e Chrome 105 ou superior. Os comandos partem de `extension/`.

## Build

```bash
npm install
npm run build
```

O `npm run build` compila `src/` com o `tsc` para `dist/` e copia a amostra sintética `../amostras/sinteticas/fala-pt.ogg` para `dist/diagnostico/`, onde `motorDiagnostico.transcreverAmostra()` a procura. Como o `manifest.json` aponta o service worker para `dist/background.js`, o build precede o carregamento no Chrome. A pasta `dist/` fica fora do Git.

## Testes

```bash
npm test               # testes unitários e bateria de contrato com o adaptador simulado
npm run typecheck      # confere os tipos de src/ e test/, sem gerar arquivos
MOTOR_REAL=1 npm test  # inclui a bateria de contrato contra o aplicativo auxiliar real
```

O `npm test` roda o `node --test` diretamente sobre os arquivos `.ts`, sem build. Sem `MOTOR_REAL=1`, o teste contra o host real aparece como ignorado. Com `MOTOR_REAL=1`, a mesma bateria de contrato roda contra o adaptador do motor local ligado ao aplicativo auxiliar verdadeiro, acompanhada dos testes de modelo ausente, de porta fechada durante o carregamento e de queda do host.

Esses testes não dependem de `motor.sh instalar` nem tocam na instalação: lançam o host a partir do código de `auxiliar/`, como o Chrome o lança, com um `config.toml` temporário. Exigem o ffmpeg, o modelo padrão no cache local do huggingface_hub e um Python com o mlx-whisper, escolhido pela mesma regra do `motor.sh`: `WHISPPER_PYTHON`, se definida; senão, o interpretador do executável `mlx_whisper` ou o `python3` do PATH. Cada host lançado carrega o modelo; com o disco frio, o carregamento passa de 30 s, e o prazo admitido é de 180 s.

Os exemplos canônicos do protocolo ficam em `../contratos/protocolo-1.json`, lidos pelos testes da extensão e do aplicativo auxiliar.

## Carregamento no Chrome

1. Rode `npm run build`.
2. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `extension/`, a que contém o `manifest.json`, e não `dist/`.
4. Confira no cartão da extensão o identificador `femjlfnijaboogbcdionddnjcjpfmieg`.

O campo `key` do `manifest.json` fixa esse identificador, que se mantém quando a extensão é removida e carregada de novo; é ele que `auxiliar/motor.sh instalar` autoriza no `allowed_origins` do host. Depois de um novo build, recarregue a extensão no próprio cartão. Recarregá-la também fecha a conexão com o host, que encerra; a verificação seguinte lança um host novo, que relê o `config.toml`.

## `motorDiagnostico` no console

Com o aplicativo auxiliar instalado (ver `../auxiliar/README.md`), clique em **service worker** no cartão da extensão para abrir o DevTools do service worker e rode no console:

```js
await motorDiagnostico.verificar()
```

A primeira chamada abre a conexão, e o Chrome lança o host, que começa a carregar o modelo. A resposta é `{ estado: "iniciando", modelo: "mlx-community/whisper-large-v3-turbo", versaoApp: "1.0.0", protocolo: 1 }` e, repetida a chamada alguns segundos depois, o mesmo objeto com `estado: "pronto"`. Com o motor indisponível, a resposta traz `estado: "indisponivel"`, o `codigo`, o `motivo` e, quando houver, a `instrucao`; o `../auxiliar/README.md` relaciona cada motivo à correção.

```js
await motorDiagnostico.transcreverAmostra()
```

Envia ao motor a amostra sintética em português copiada pelo build e devolve `{ ok: true, texto, idioma: "pt", duracaoAudioSeg, processamentoMs }`. Um pedido feito durante o carregamento aguarda o fim dele. Falhas previstas não lançam exceção: voltam como `{ ok: false, codigo, motivo, instrucao }`, com a `instrucao` apenas quando houver. A amostra ausente em `dist/diagnostico/`, por sua vez, lança um erro que manda rodar `npm run build`. Defeitos de protocolo aparecem no mesmo console como avisos prefixados por `[motor local]`.

## Extensão intrusa

A pasta `test/extensao-intrusa/` contém uma extensão sem a `key` autorizada, para verificar que o Chrome recusa a conexão de outra extensão (RF-14). Carregada sem compactação, ela tenta se conectar ao host ao iniciar e registra no console do seu service worker o erro "Access to the specified native messaging host is forbidden."; `tentarConectar()` repete a tentativa.

## Organização

| Caminho | Conteúdo |
|---------|----------|
| `src/dominio/motor-de-transcricao.ts` | porta `MotorDeTranscricao`, sem dependência do Chrome |
| `src/adaptadores/motor-local/` | adaptador sobre Native Messaging, protocolo 1 e canal do Chrome |
| `src/adaptadores/motor-simulado.ts` | adaptador simulado, submetido à mesma bateria de contrato |
| `src/background.ts` | service worker e `motorDiagnostico` |
| `test/contrato-motor.ts` | bateria de contrato comum aos dois adaptadores |
| `test/suporte/` | canal simulado, canal do Node que lança o host real, Chrome e relógio falsos |
