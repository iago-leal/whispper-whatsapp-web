# Interface: registro do aplicativo auxiliar no Brave e no Chrome do Windows

> Feature: `008-motor-local-windows`
> Data: `2026-10-29`
> Tipo: arquivo e registro do Windows (contrato com o navegador)
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Objetivo do contrato

🟢 O navegador só inicia um aplicativo de Native Messaging que encontre registrado e que autorize a origem da extensão. No macOS, o registro é um arquivo JSON numa pasta conhecida do Chrome (`auxiliar/README.md#instalação`). No Windows, o registro é uma entrada no registro do sistema cujo valor padrão aponta para o mesmo tipo de arquivo JSON, guardado onde o instalador quiser. Este documento fixa o que a instalação grava, o que o navegador lê e o que a desinstalação remove.

O protocolo 1 entre a extensão e o aplicativo (`_reversa_sdd/sdd/motor-transcricao-local.md#8-design-e-interface`) não muda e não é descrito aqui.

## 2. Entradas no registro do usuário

| Navegador | Chave (em `HKEY_CURRENT_USER`) | Valor | Conteúdo | Confidência |
|-----------|-------------------------------|-------|----------|-------------|
| Chrome | `Software\Google\Chrome\NativeMessagingHosts\whispper_whatsapp_web.motor` | padrão (`REG_SZ`) | caminho absoluto do manifesto do host | 🟢 |
| Brave | `Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\whispper_whatsapp_web.motor` | padrão (`REG_SZ`) | o mesmo caminho | 🟢 |

- 🟢 Só `HKEY_CURRENT_USER`: nenhuma escrita em `HKEY_LOCAL_MACHINE`, que exigiria administrador (RN-05).
- 🟢 A chave do Brave segue o padrão observado no desktop da AFLA em 2026-10-29, onde Bitwarden e Granola registram seus hosts nas duas chaves.
- 🟢 O nome `whispper_whatsapp_web.motor` é o `NOME_DO_HOST` já usado no Mac (`auxiliar/whispper_motor/__init__.py`).

## 3. Manifesto do host

Caminho: `%LOCALAPPDATA%\whispper-motor\whispper_whatsapp_web.motor.json`, dentro da pasta do aplicativo.

```json
{
  "name": "whispper_whatsapp_web.motor",
  "description": "Motor de transcrição local do whispper-whatsapp-web",
  "path": "C:\\Users\\<usuario>\\AppData\\Local\\whispper-motor\\whispper-motor.bat",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/"]
}
```

- 🟢 Mesmos campos do manifesto do Mac (`_manifesto_do_host` em `auxiliar/whispper_motor/instalacao.py`); muda só o `path`, que aponta para o lançador `.bat`.
- 🟢 `allowed_origins` sem curinga, com o identificador calculado da `key` de `extension/manifest.json` (W014, W022).
- 🟡 Um manifesto só, lido pelos dois navegadores. Como os dois leem o mesmo arquivo, a origem autorizada é a mesma, e a extensão carregada sem compactação tem o mesmo identificador nos dois, porque ele vem da `key`.

## 4. Como o navegador inicia o host

| Aspecto | Comportamento no Windows | Confidência |
|---------|--------------------------|-------------|
| Processo intermediário | O navegador inicia o `.bat` por meio do `cmd.exe`, com a janela oculta. | 🟢 |
| Argumentos | Primeiro, a origem `chrome-extension://<id>/`; depois, `--parent-window=<número>`, identificador da janela que fez a conexão. O host usa só o primeiro e ignora os demais (RF-09). | 🟢 |
| Ambiente | O ambiente do próprio navegador, sem o PATH mínimo que o macOS impõe. O lançador define `HF_HUB_OFFLINE`, `HF_HUB_DISABLE_TELEMETRY`, `WHISPPER_MOTOR_PASTA`, `PYTHONPATH` e `PYTHONSAFEPATH`, como o lançador do Mac. | 🟢 |
| Entrada e saída | Pipes anônimos em modo binário; cada mensagem com 4 bytes de tamanho na ordem nativa (little-endian no x86-64). O host fixa o modo binário dos descritores 0 e 1 antes de ler. | 🟢 |
| Encerramento | Ao fechar a porta, o navegador fecha a entrada do host; o host termina com código 0 no fim da entrada, como no Mac. | 🟢 |

## 5. Lançador `whispper-motor.bat`

```bat
@echo off
rem Lançador do host de Native Messaging do whispper-whatsapp-web, gravado por motor.cmd instalar.
set "HF_HUB_OFFLINE=1"
set "HF_HUB_DISABLE_TELEMETRY=1"
set "WHISPPER_MOTOR_PASTA=C:\Users\<usuario>\AppData\Local\whispper-motor"
set "PYTHONPATH=C:\Users\<usuario>\AppData\Local\whispper-motor"
set "PYTHONSAFEPATH=1"
"C:\Users\<usuario>\.venvs\whispper-motor\Scripts\python.exe" -m whispper_motor %*
```

- 🟢 `%*` repassa a origem e os argumentos extras; quem os filtra é o host.
- 🟡 O `cmd.exe` interpreta `%`, `^`, `&`, `|`, `<`, `>` e `!` mesmo dentro de aspas em certas posições. A instalação recusa caminhos de pasta do aplicativo ou do Python que contenham esses caracteres, em vez de tentar escapá-los, e informa o caminho recusado.

## 6. Erros e casos de borda

| Caso | Resultado esperado | Confidência |
|------|--------------------|-------------|
| Entrada de registro ausente | O navegador não encontra o host; a extensão recebe MOTOR_INDISPONIVEL com "aplicativo auxiliar não instalado". | 🟢 |
| Entrada presente e manifesto ausente | Mesmo resultado do caso anterior; o diagnóstico aponta "manifesto não encontrado". | 🟢 |
| Extensão de outra origem | O navegador recusa a conexão com "Access to the specified native messaging host is forbidden."; o host nem é iniciado. | 🟢 |
| Origem divergente chegando ao host | Código 2 e "origem recusada" no `diagnostico.log`, sem carregar nada. | 🟢 |
| Lançador com Python inexistente | O `cmd.exe` termina com erro; a extensão recebe "aplicativo auxiliar encerrou"; o diagnóstico mostra o caminho do Python. | 🟡 |

## 7. Idempotência e ordem

- 🟢 Instalar de novo regrava manifesto, lançador e código e reescreve as duas entradas de registro com o mesmo valor; nada se acumula.
- 🟢 Na instalação, as entradas de registro são gravadas por último, depois do manifesto completo, para que o navegador nunca encontre um host pela metade (mesma ordem do Mac, `instalar` em `instalacao.py`).
- 🟢 Na desinstalação, as entradas de registro saem primeiro, para que o navegador deixe de iniciar o host antes que o código suma.
- 🟡 A desinstalação remove só o valor e a subchave `whispper_whatsapp_web.motor`; nunca a chave `NativeMessagingHosts`, que guarda os hosts de outros aplicativos.

## 8. Tempos

- 🟢 O diagnóstico espera até 10 s por cada resposta do host e até 15 s pelo encerramento depois de fechar a entrada (`PRAZO_DE_RESPOSTA_S` e `ESPERA_DO_ENCERRAMENTO_S` em `instalacao.py`).
- 🟢 A extensão declara o motor indisponível se a verificação não responder em 10 s (W019).
