# Testes de mutação da correção: BUG-20261002-XDL5

| Campo | Valor |
|---|---|
| Data | 2026-10-02, cerca de 20:25 -03, depois do Gate 2 e antes do fechamento |
| Onde | cópia isolada da extensão, fora do projeto, com `ponte-audio.ts`, `configuracao-estruturas.ts` e `extrator-audio.test.ts` idênticos byte a byte aos aplicados |
| Comando | `node --test --test-reporter=spec test/extrator-audio.test.ts` |
| Método | cada mutação retira uma das três partes do CHG-002 e é desfeita em seguida; o arquivo restaurado foi conferido byte a byte com o aplicado |

| Mutação | Saída | Testes que falham |
|---|---|---|
| 0. Nenhuma | 0 (11 ok) | nenhum |
| 1. Sem a cópia: a ponte volta a transferir o buffer da página | 1 (9 ok, 2 falhas) | reprodução 2 (cópia da página com o tamanho); reprodução 3 (cópia vazia baixada de novo) |
| 2. Sem a cura: a cópia vazia não é apagada | 1 (9 ok, 2 falhas) | reprodução 3; regressão 1 (vazio depois de apagar vira AUDIO_INDISPONIVEL) |
| 3. Sem a falha legível: 0 bytes seguem para o núcleo | 1 (9 ok, 2 falhas) | regressão 1; regressão 2 (sem o módulo, a cópia vazia vira AUDIO_INDISPONIVEL) |

Cada parte da correção é exigida por pelo menos um teste. Na mutação 1, a reprodução 1 (o mesmo áudio duas vezes)
passa sozinha: a cura apaga a cópia esvaziada e baixa o áudio de novo a cada pedido, e o usuário não veria falha.
O defeito, porém, continuaria: a cópia da página seria esvaziada a cada transcrição, o que deixaria o player do
WhatsApp sem bytes (BUG-20261002-YUB4) e custaria um download a cada pedido. Por isso a reprodução 2 mede a cópia da
página, e não só o que chega ao núcleo.

## Saída

```
== 0. sem mutação (saída 0)
ℹ tests 11
ℹ pass 11
ℹ fail 0

== 1. sem a cópia: transfere o buffer da página (saída 1)
ℹ tests 11
ℹ pass 9
ℹ fail 2
✖ reprodução (XDL5): a obtenção não esvazia a cópia da página: a entrada do áudio no cache de mídia segue com o tamanho dele
✖ reprodução (XDL5): o áudio cuja cópia no cache da página já está vazia é baixado de novo: só aquela entrada é apagada, e os bytes chegam

== 2. sem a cura: não apaga a cópia vazia (saída 1)
ℹ tests 11
ℹ pass 9
ℹ fail 2
✖ regressão (XDL5): se a página devolve 0 bytes mesmo depois de apagar a entrada, a obtenção termina em AUDIO_INDISPONIVEL com motivo legível, e o núcleo não recebe áudio vazio
✖ reprodução (XDL5): o áudio cuja cópia no cache da página já está vazia é baixado de novo: só aquela entrada é apagada, e os bytes chegam

== 3. sem a falha legível: repassa 0 bytes (saída 1)
ℹ tests 11
ℹ pass 9
ℹ fail 2
✖ regressão (XDL5): se a página devolve 0 bytes mesmo depois de apagar a entrada, a obtenção termina em AUDIO_INDISPONIVEL com motivo legível, e o núcleo não recebe áudio vazio
✖ regressão (XDL5): sem o módulo do cache de mídia, a cópia vazia termina em AUDIO_INDISPONIVEL, e os áudios íntegros continuam a ser entregues

restaurado: igual ao aplicado
```
