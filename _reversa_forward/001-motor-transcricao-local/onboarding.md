# Onboarding: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Para quem vai testar a feature pela primeira vez, num Mac com Apple Silicon.
> Os comandos partem da raiz do repositório.

## 1. Pré-requisitos

Confira cada item; o instalador recusa se algum faltar.

```bash
uname -m                                   # arm64
command -v ffmpeg                          # caminho do ffmpeg
command -v mlx_whisper                     # executável do mlx-whisper
head -1 "$(command -v mlx_whisper)"        # interpretador que tem o mlx-whisper
ls ~/.cache/huggingface/hub | grep whisper-large-v3-turbo
node --version                             # 24 ou superior
```

Se o modelo não estiver no cache, `auxiliar/motor.sh instalar` recusa e mostra o comando que o baixa, `'<python>' -c "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/whisper-large-v3-turbo')"`. É a única etapa com rede, e fica fora do aplicativo.

## 2. Prova de conceito de latência (fase 0)

1. Copie dez mensagens de voz reais do WhatsApp, de 5 s a 5 min, para `amostras/reais/`. A pasta é ignorada pelo Git; nunca as mova para outro lugar do repositório.
2. Rode:

   ```bash
   "$(head -1 "$(command -v mlx_whisper)" | cut -c3-)" auxiliar/ferramentas/prova_de_conceito.py amostras/reais --mostrar-texto
   ```

3. Resultado esperado: para cada arquivo, a duração, o tempo de processamento, o limite (o maior entre 2 s e 10 s por minuto) e a marca `OK`; ao fim, o tempo de carregamento do modelo e o pico de memória. O texto aparece só no terminal e não é gravado.
4. Se algum arquivo aparecer como `ACIMA`, pare aqui e leve o relatório à decisão sobre o modelo.

## 3. Extensão

```bash
cd extension
npm install
npm run build        # gera extension/dist/
npm test             # testes unitários e bateria de contrato com o adaptador simulado
cd ..
```

1. Abra `chrome://extensions`, ligue o **Modo do desenvolvedor** e use **Carregar sem compactação** apontando para a pasta `extension/`.
2. Anote o identificador exibido no cartão da extensão.
3. Remova a extensão, carregue-a de novo e confira que o identificador não mudou (RF-22).

## 4. Aplicativo auxiliar

```bash
auxiliar/motor.sh instalar
```

Resultado esperado: a lista de pré-requisitos com `ok`, o interpretador escolhido, o identificador da extensão (igual ao do passo 3.2) e os caminhos gravados. Em seguida:

```bash
auxiliar/motor.sh diagnosticar
```

Resultado esperado: o manifesto do host instalado, o `allowed_origins` coerente com o identificador da extensão e uma verificação feita diretamente no host, sem o Chrome, respondendo `carregando` e depois `pronto`.

## 5. Verificação e transcrição dentro do Chrome

1. Em `chrome://extensions`, no cartão da extensão, clique em **service worker** para abrir o console.
2. Rode:

   ```js
   await motorDiagnostico.verificar()
   ```

   Esperado: `{ estado: "iniciando", … }` na primeira chamada e, depois de alguns segundos, `{ estado: "pronto", modelo: "mlx-community/whisper-large-v3-turbo", … }`.
3. Rode:

   ```js
   await motorDiagnostico.transcreverAmostra()
   ```

   Esperado: `{ ok: true, texto: "…", idioma: "pt", duracaoAudioSeg: …, processamentoMs: … }`, a partir da amostra sintética empacotada na extensão.

## 6. Verificações manuais de privacidade e segurança

- **Sem rede (RF-12):** com a transcrição em curso, rode `host=$(pgrep -f 'whispper_motor chrome-extension' | head -1); for p in $host $(pgrep -P "$host"); do lsof -nP -i -a -p "$p"; done` e confira que a saída está vazia. O laço cobre o host e seus filhos, porque o mlx-whisper roda no trabalhador, cuja linha de comando não contém `whispper_motor`. Repita com o Wi-Fi desligado e confira que a transcrição conclui.
- **Sem retenção (RF-13):** após alguns pedidos, rode `ls "$TMPDIR" | grep whispper-motor` e confira que a pasta temporária do host está vazia; abra `~/Library/Application Support/whispper-motor/desempenho.tsv` e confira que não há texto transcrito.
- **Origem autorizada (RF-14):** carregue sem compactação a extensão de teste em `extension/test/extensao-intrusa/` e, no console dela, rode `chrome.runtime.connectNative("whispper_whatsapp_web.motor")`; o erro esperado é "Access to the specified native messaging host is forbidden".
- **Queda (RF-10):** com o motor pronto, rode `pkill -9 -f 'whispper_motor chrome-extension'`; a verificação seguinte no console reconecta e volta a `iniciando` e depois `pronto`. Em até 1 s o trabalhador do host derrubado também encerra, o que `pgrep -fl multiprocessing` confirma.

## 7. Testes automatizados

```bash
"$(head -1 "$(command -v mlx_whisper)" | cut -c3-)" -m pytest auxiliar/tests            # sem o modelo real
MOTOR_REAL=1 "$(head -1 "$(command -v mlx_whisper)" | cut -c3-)" -m pytest auxiliar/tests  # inclui o modelo real
cd extension && MOTOR_REAL=1 npm test                                                    # contrato contra o host real
```

## 8. Desfazer

```bash
auxiliar/motor.sh desinstalar
```

A desinstalação encerra também o host que o Chrome mantém conectado, de modo que a verificação seguinte no console já devolve `indisponivel`.

Depois, remova a extensão em `chrome://extensions`. Confira que `~/Library/Application Support/whispper-motor/` e o manifesto em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` não existem mais e que o cache de modelos continua intacto.
