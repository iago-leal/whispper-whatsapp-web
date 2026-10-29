# Auditoria de spec da feature 008 (T055)

> Data: 2026-10-29
> Agente: `auditor-spec`, somente leitura
> Unidades: `motor-transcricao-local` e `compatibilidade-instalacao`, no recorte do delta da feature 008
> Fontes: `_reversa_sdd/sdd/motor-transcricao-local.md`, `_reversa_sdd/sdd/compatibilidade-instalacao.md`, adendos vigentes `001-motor-transcricao-local.md` e `005-compatibilidade-instalacao.md`, `requirements.md` (RF-01 a RF-20, RN-01 a RN-07) e `roadmap.md` (D-01 a D-22) desta feature
> Código: `auxiliar/` e, onde o motor local aparece, `extension/src/adaptadores/motor-local/` e `extension/test/`, no commit `8192492`

Contagem do agente: 20 atendidos, 2 sem teste, 4 divergentes, 1 ausente por decisão (Won't) e 6 que dependem de verificação em execução. Os achados marcados **conferido** foram verificados à parte no código, e o S7 também no faster-whisper instalado no desktop.

## 1. Cobertura

| ID | Classe | Evidência | Observação |
|----|--------|-----------|------------|
| RF-01 | atendido | `extension/test/suporte/canal-node.ts`; T047 | Bateria de contrato contra o host real no desktop. |
| RF-02 | atendido | `trabalhador.py` (`laco_ct2`); `test_real.py`, `test_laco_ct2.py` | pt, en e silêncio no Windows com `MOTOR_REAL=1` (T046). |
| RF-03 | atendido | `audio.py`, `plataforma.py`; `test_audio.py` | Inclui o manifesto DASH forjado. |
| RF-04 | atendido | `servidor.py`; `test_servidor_falhas.py` | No Windows, o teste de recarga de `test_real.py` passa por construção, porque `laco_ct2` devolve `recarregou=False`; a garantia vem da estrutura. |
| RF-05 | atendido | `servidor.py`; `test_servidor_fluxo.py`, `test_servidor_falhas.py` | Confirmado também pela ocorrência de prazo da T049. |
| RF-06 | execução (T050) | `instalacao.py`, `__main__.py`, `motor.cmd`; `test_real.py` | Zero conexões na conferência pelo SSH da T050. Ver S7. |
| RF-07 | atendido | `audio.py`, `plataforma.py`; `test_audio.py`, `test_host_encerramento.py` | Confirmado na queda forçada da T050. |
| RF-08 | atendido | `plataforma.py` (job), `__main__.py`; `test_host_encerramento.py`, `test_plataforma_windows.py` | Confirmado na queda forçada da T050. |
| RF-09 | sem teste (parcial) e T050 | `__main__.py`; `test_host_processo.py` | Ver C5. |
| RF-10 | atendido, com duas divergências menores | `instalacao.py`; `test_prerequisitos_windows.py`, `test_instalacao_windows.py`; T048 | Ver C3 e C4. |
| RF-11 | atendido | `instalacao.py`; `test_instalacao_windows.py` | O "pronto" no Brave fica para a T050. |
| RF-12 | atendido (simulado) | `instalacao.py`, `plataforma.py`; `test_desinstalacao_windows.py` | A aceitação no desktop é a T051. Ver C6. |
| RF-13 | atendido | `instalacao.py`; `test_diagnostico_windows.py` | O código de saída de `_comando_diagnosticar` não tem teste. |
| RF-14 | execução (T050) | `registro.py`, `trabalhador.py`; `test_dispositivo.py` | O acesso restrito ao dono vem da permissão herdada de `%LOCALAPPDATA%`. |
| RF-15 | atendido | `instalacao.py`; `test_instalacao_windows.py` | |
| RF-16 | atendido | T045, T052 | |
| RF-17 | atendido | motivos de cada teste ignorado nomeiam a plataforma ou o `MOTOR_REAL` | 197 aprovados e 21 ignorados no desktop. |
| RF-18 | execução (T050) | | |
| RF-19 | atendido | `trabalhador.py`; `test_dispositivo.py`; T048 | |
| RF-20 e RN-07 | divergente (parcial) | `trabalhador.py`, `servidor.py`; `test_dispositivo.py`; T049 | O critério de aceite passa; a queda do processo não aciona a reserva. Ver C1. |
| RN-01 | execução (T050) | mesma evidência do RF-06 | Ver S7. |
| RN-02 a RN-06 | atendidos | `configuracao.py`, `trabalhador.py`, `__init__.py`, `instalacao.py`, `motor.cmd`; T045, T052 | O texto das instruções da extensão no Windows está errado (C2). |
| EC-01 e Fluxo A do motor, W010, no Windows | divergente | `adaptador-motor-local.ts` | Ver C2. |
| Comandos de terminal (D-15; RF-12, RF-13) | sem teste | `motor.cmd`, `instalacao.py` | Ver C6. |
| Compatibilidade RF-03 | execução (anterior à 008) | `compatibilidade.ts`; `compatibilidade.test.ts` | Com a redução do userAgent, o navegador informa "Win64" também num Windows de 32 bits; o teste injeta `x86_32` diretamente. |
| Compatibilidade RF-06 e RF-07 no Windows | ausente por decisão | `compatibilidade.ts` | Won't da 008 (`requirements.md`, seção 8). |
| Compatibilidade RF-08 | execução (parcial) | ramo `laco_ct2` | O adaptador existe; a instalação é pelo terminal, sem instalador. |

As decisões D-01 a D-22 estão conformes, com três ressalvas: D-05 (C1), D-06 (S5) e D-14 (S2).

## 2. Candidatos a `/reversa-debugger`

O `_reversa_bugs/` não tem contexto do motor; o agente sugere `compatibilidade-instalacao` para os achados do aplicativo auxiliar no Windows.

**C1. A reserva no processador não cobre a queda do trabalhador durante o carregamento na placa.** P3, que sobe para P2 se reproduzida com as bibliotecas reais da NVIDIA. RF-20 e RN-07 incluem bibliotecas "ausentes ou incompatíveis". Em `trabalhador.py` (`carregar_com_reserva`), só uma exceção leva ao processador; se o processo cai, `aguardar_carregamento` devolve "falha ao carregar o modelo", o servidor passa a `erro`, e desse estado só se sai com outro host, que tenta a placa de novo. A conferência prévia cobre cinco bibliotecas, e o próprio comentário admite que, sem uma delas, o cuDNN derruba o processo. Reprodução sugerida: fábrica falsa que chame `os._exit` com `device="cuda"`. **Conferido.**

**C2. As instruções da extensão citam `auxiliar/motor.sh` também no Windows.** P3, contexto `painel-da-extensao`. Além de `INSTRUCAO_INSTALACAO`, também `INSTRUCAO_REINSTALACAO` e `INSTRUCAO_ATUALIZACAO`, em `extension/src/adaptadores/motor-local/adaptador-motor-local.ts`, mostradas no erro "forbidden" e na versão incompatível. Já era pendência conhecida; o achado amplia o alcance.

**C3. Aviso falso de "sem placa NVIDIA" quando falta o faster-whisper.** P3. Em `instalacao.py`, `placa = faster_whisper and _placas_cuda() > 0`: sem o faster-whisper, a instalação recusada mostra "sem placa NVIDIA" numa máquina que tem a placa, e omite o comando das bibliotecas que o RF-10 pede. O teste de `test_prerequisitos_windows.py` zera `placa_cuda` à mão e não distingue o caso. **Conferido.**

**C4. O comentário do lançador, gravado na página de código OEM, derruba a instalação em Windows de outros idiomas.** P3. A linha `rem Lançador ...` é gravada com `codificacao="oem"`; o "ç" não existe nas páginas 866, 932, 936, 949 e 950, e o `UnicodeEncodeError` surge depois de o código e o `config.toml` já estarem gravados, porque a conferência prévia só testa os caminhos e o `principal` só captura `OSError`. Resultado: rastreamento na tela e instalação parcial. No Windows em português (página 850), não ocorre. **Conferido** (as cinco páginas recusam o "ç"; 437, 850 e 852 o aceitam). Hipótese não conferida: com `chcp 65001`, o `diagnosticar` leria o `.bat` em UTF-8 e falharia com caminho acentuado.

**C5. O RF-09 não tem teste do código 2 nem da linha "origem recusada".** P3, requisito Must. O código existe em `__main__.py`; o teste de `test_host_processo.py` só afirma código diferente de zero e saída vazia.

**C6. Os comandos de terminal do Windows não têm teste.** P3. A escolha do Python e a recusa de versão do `motor.cmd`, a mensagem com o PID na desinstalação e o código de saída do diagnóstico só foram exercitados manualmente (T048).

## 3. Comportamento sem requisito

- **S1.** O host troca a própria entrada padrão pelo nulo também no Mac (`_proteger_entrada_padrao`, correção do deadlock do Windows). Nenhuma decisão D-xx a registra; candidata ao registro de decisões no adendo.
- **S2.** O lançador do Windows define `PYTHONUTF8=1` e `OPENBLAS_NUM_THREADS=1`, além das variáveis do Mac que o D-14 e `interfaces/registro-native-messaging-windows.md` pedem; convém emendar a interface. O `canal-node.ts` reproduz o `PYTHONUTF8`, mas não o `OPENBLAS_NUM_THREADS`, o que só afeta a memória comprometida nos testes.
- **S3.** A instalação recusa caminhos que a página OEM não representa, regra que vai além dos sete caracteres do D-14; candidata ao registro de decisões.
- **S4.** O `-timelimit` do FFmpeg segue no Windows sem efeito, coerente com o D-10, que o substitui pelo job; o comentário de `audio.py` e o `README.md` afirmam o limite de CPU sem ressalva de plataforma.
- **S5.** O D-06 conflita com o W011: na placa, qualquer exceção recria o trabalhador, inclusive a falha de um único áudio, e o W011, estendido ao Windows pelo `requirements.md`, trata isso como sinal de regressão. A decisão cabe ao adendo.
- **S6.** O prazo de transcrição é o mesmo nas duas plataformas e nos dois dispositivos; no processador, a folga é de cerca de 1,6 vez, e o prazo estourou sob carga na T049. Candidato ao registro de decisões.
- **S7.** `modelos.resolver` aceita uma pasta CTranslate2 sem `tokenizer.json`. **Conferido no desktop:** em `faster_whisper/transcribe.py` 1.2.1, sem esse arquivo, o `WhisperModel` chama `tokenizers.Tokenizer.from_pretrained("openai/whisper-tiny")`, que busca o tokenizador no Hugging Face, o que violaria RN-01, RF-06 e W012. O modelo padrão instalado tem `tokenizer.json`; o risco existe só com outro modelo configurado. Passa a candidato P3.
- **S8.** A guarda do `refs/main` em `modelos.py` só barra "/"; no Windows, "\\" ou uma letra de unidade escapam de `snapshots`. Risco baixo: o arquivo é local e do próprio usuário.
- **S9.** Com configuração inválida, o host não confere a origem; comportamento anterior à 008, documentado no README, e o navegador continua aplicando o `allowed_origins`.
- **S10.** O encerramento conferido da desinstalação só reconhece `python[0-9.]*.exe`; com `pythonw.exe` ou `python3.13t.exe`, o host ficaria vivo (W016). Caso de borda.

## 4. Pontos a convergir no adendo da 008

- **Motor:** NG-02, RNF-04, as menções a "mlx-whisper" no RF-02 e na seção 10, "no Chrome" no RF-14 e no RF-16, e o "formato MLX" da spec `motor-transcricao-local.md`.
- **Compatibilidade:** a linha "em aberto (OQ-02)" da seção 9 e a própria OQ-02 de `compatibilidade-instalacao.md`, já respondidas pelo D-01.
- **Conflito a decidir:** o RF-14 da compatibilidade remove a pasta de modelos, enquanto o RF-12 da 008 preserva o cache.
