# Questões e Premissas — Núcleo de Transcrição

**Feature ID:** `004`
**Origem:** `_reversa_sdd/sdd/nucleo-transcricao.md` (Seção 14 Open Questions)
**Modo:** Autônomo (premissas fixadas)

---

## 1. Premissas Fixadas

### OQ-01: Piso de latência para áudios curtos
- **Premissa adotada:** O timeout configurado é o maior entre 60 s e 30 s por minuto de áudio estimado. Para áudios curtos (ex.: 5 a 10 segundos), o piso de timeout de 60 segundos assegura que modelos em carregamento ou filas locais não disparem timeouts precipitados.

### OQ-02: Destino de áudios apagados ("Mensagem apagada para todos")
- **Premissa adotada:** Ao receber o evento `mensagemRemovida(idAudio)`, o núcleo remove o pedido da fila (se pendente), cancela ou descarta o resultado, limpa o texto do cache em memória da sessão e notifica a janela flutuante para fechar imediatamente, garantindo conformidade com a privacidade da ação de exclusão do remetente.

### OQ-03: Escopo de idempotência dos contadores
- **Premissa adotada:** A desduplicação de eventos por `idAudio` reside estritamente na memória da aba durante a sessão (`Set<string>` para identificadores classificados). Reinicializações da aba assumem o comportamento idempotente natural do WhatsApp Web (reproduções subsequentes são tratadas normalmente pela aba ativa).

### OQ-04: Timeout e cancelamento gracioso
- **Premissa adotada:** O núcleo implementa um `AbortController` ou timer de timeout individual por pedido ativo. Se o timeout estourar, o pedido recebe erro `TEMPO_ESGOTADO`, a janela é atualizada e a fila avança para o próximo pedido sem reter referências de memória.
