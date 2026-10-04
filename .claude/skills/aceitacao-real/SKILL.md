---
name: aceitacao-real
description: Roteiro da aceitação de um bug ou feature do whispper-whatsapp-web no WhatsApp Web real, com a conta do usuário. Fixa pré-condições (build carimbado, extensão e aba recarregadas), escolhe o instrumento de medida, protege as conversas (LGPD) e registra o resultado no modelo aceitacao-whatsapp-real.md. Só o usuário invoca.
argument-hint: "<BUG-ID ou feature> [critérios]"
disable-model-invocation: true
---

# /aceitacao-real

A aceitação real fecha um bug pela closure policy do Reversa ou encerra uma feature. Ela mexe na conta
de WhatsApp do usuário, com conversas de terceiros, por isso só começa quando ele pede.

## 1. Pré-condições, nesta ordem

1. Rode `/verificar` (modo completo). O build grava `extension/dist/carimbo-build.txt`; o registro cita
   esse carimbo, nunca uma hora lembrada (o A4MZ ficou com "16:45" num build das 16:42).
2. Peça ao usuário que recarregue a extensão em `chrome://extensions` e a aba do WhatsApp Web. No
   instrumento `whatsapp-cft`, você mesmo recarrega a aba depois do build.
3. Liste os critérios a conferir, numerados como no `bug.md` ou no `requirements.md`, antes de olhar a
   tela. Critério escrito depois da medida vira descrição do que se viu.

## 2. Instrumento, em ordem de preferência

1. **MCP `whatsapp-cft`**: Chrome for Testing com a extensão carregada e perfil persistente em
   `~/.cache/whispper-cft-perfil` (login por QR uma única vez, com a conta real do usuário; a seção 3
   diz por quê e como contê-la). Mede direto no DOM com
   `evaluate_script`: `getBoundingClientRect`, contagens, `ack`, duração. Esse perfil fica logado
   entre sessões e não tem a trava por site do claude-in-chrome. Desde 2026-10-04, por decisão do
   usuário, as ferramentas dele rodam sem aprovação (`permissions.allow` em `.claude/settings.json`),
   e as que digitam ou enviam (`type_text`, `fill`, `fill_form`, `press_key`, `upload_file`, `drag`)
   estão em `deny`. O `evaluate_script` continua capaz de escrever na página: a seção 3 é a barreira.
   Com perfil próprio, o Chrome procura o host do motor em `<perfil>/NativeMessagingHosts/`, e não na
   pasta do Chrome de marca; lá fica um link para o manifesto que o instalador grava. Se o
   `connectNative` disser `Specified native messaging host not found.`, refaça esse link.
2. **claude-in-chrome** numa aba do grupo da automação, no Chrome do usuário com a extensão
   desempacotada. O grupo se perde na compactação do contexto; se a aba sumir, passe ao instrumento 3
   em vez de insistir.
3. **Prints do usuário** medidos com `ffmpeg` em colunas de pixels, por limiar de luminância, sem ler
   texto. Escala: zoom 100% dá 2 px por px CSS, 125% dá cerca de 2,5; confirme pela janela flutuante,
   que tem 320 px CSS.

## 3. Privacidade (LGPD)

O perfil do `whatsapp-cft` usa a conta real do usuário, porque não há número sobrando para uma conta
de teste (decisão de 2026-10-04). A contenção abaixo faz as vezes da separação de contas:

- **Só duas conversas.** Você entra apenas na conversa do usuário consigo mesmo (áudios enviados,
  gravados por ele) e no grupo `Whispper teste` (áudios recebidos, de quem aceitou mandá-los). Entre
  por um `evaluate_script` que procura o `span[title]` exato em `#pane-side` e despacha nele
  `pointerdown`, `mousedown`, `pointerup`, `mouseup` e `click` (só `mousedown` e `click` na linha não
  abrem a conversa), devolvendo só se achou e se abriu; nunca devolva nomes nem prévias. Outra conversa, só o usuário abre, e nada técnico o impediria: a regra é sua.
- **Barra lateral escondida.** Depois de cada carga ou recarga da aba, aplique
  `#side { visibility: hidden !important }` por uma `CSSStyleSheet` em `document.adoptedStyleSheets`;
  um `<style>` no `head` some quando uma conversa abre (visto em 2026-10-04). Antes de qualquer print
  ou `take_snapshot`, confira que `getComputedStyle(#side).visibility` é `hidden`. A `visibility` tira
  nomes e prévias do print e da árvore de acessibilidade sem mexer na largura da área da conversa, de
  que depende o limiar de 726 px da seção 4; `display: none` mudaria essa largura.
- **Nenhum envio pela automação.** Seus cliques se limitam ao ícone da extensão e ao ▶ do player.
  Quem grava e manda os áudios é o usuário, pelo celular; uso de leitura é o de menor risco de
  suspensão, que aqui recairia sobre o número principal.
- Leia só estrutura e estado: contagens, tipos, `ack`, duração, geometria. Do texto transcrito, só o
  número de palavras; a fidelidade quem confere é o usuário.
- Print original não sai da máquina. Guarde no registro a cópia desfocada, gerada por
  `scripts/desfocar.sh <print.png>`; ela e o original ficam fora do git pelo `.gitignore`, e o hook
  de dados pessoais barra o `git add -f`.

## 4. Armadilhas já pagas

- **Aba em segundo plano:** a aba aberta por `Target.createTarget` nasce em segundo plano e não dispara
  `scroll` nem `resize`. Antes de medir rolagem, traga-a para frente (`Page.bringToFront`).
- **RF-07, reprodução:** o instrumento do remetente é cego quando as confirmações de leitura estão
  desligadas. Use o `ack` do destinatário, com controle positivo (um áudio tocado passa a 4). O teste de
  não reprodução vem **antes** da conferência de fidelidade, porque tocar o áudio muda o `ack`.
- **Modo lateral ou abaixo:** o modo lateral do RF-01 exige área da conversa de 726 px CSS ou mais
  (62 de margem, 336 do balão, 8 de vão, 320 da janela). Registre a largura medida; abaixo disso, toda
  janela cai no modo abaixo, e critérios do modo lateral ficam "não verificáveis", não "passou".
- **Medida, não impressão:** cada "passou" aponta o número que o sustenta.

## 5. Registro

Grave `aceitacao-whatsapp-real.md` a partir de `modelo-aceitacao.md`, na pasta `evidence/` do bug
(`_reversa_bugs/<contexto>/bugs/<BUG>/evidence/`) ou na pasta da feature em `_reversa_forward/`.
Cada critério recebe um destes resultados: **passou**, **reprovado** ou **não verificável**, sempre com
o motivo. Achado lateral vira candidato a `/reversa-debugger`, descrito e não corrigido.
