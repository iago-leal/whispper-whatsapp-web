# Requirements Audit

> Identificador da feature: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Documento auditado: `_reversa_forward/006-cronometro-transcricao/requirements.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de itens | 20 |
| Aprovados | 17 |
| Reprovados | 3 |
| Veredito | Aprovado com ressalvas |

## Itens por categoria

### Clareza

- [X] Q-001 | Clareza | Cada RF tem sujeito ("o sistema"), verbo e objeto explícitos, e os textos de interface aparecem entre aspas, sem paráfrase?
- [X] Q-002 | Clareza | Há frases com "talvez", "provavelmente" ou "se possível" sem valor numérico?
- [ ] Q-003 | Clareza | O formato do tempo total na conclusão é único para qualquer duração de espera?
- [X] Q-004 | Clareza | O início e o fim da contagem estão definidos sem ambiguidade (RN-01)?

### Completude

- [X] Q-005 | Completude | As onze seções obrigatórias do template estão preenchidas, sem marcador de modelo?
- [X] Q-006 | Completude | Cada RF tem critério de aceite verificável, com número ou texto exato?
- [X] Q-007 | Completude | Existem cenários Gherkin para casos felizes e para casos negativos (erro, novo clique)?

### Consistência

- [X] Q-008 | Consistência | "Pedido", "espera", "acumulado", "indicador de concluído" e "espera média" têm a mesma grafia em todas as seções?
- [X] Q-009 | Consistência | Os IDs citados (RN-01 a RN-09, RF-01 a RF-15, L-01, L-02) existem onde são definidos?
- [X] Q-010 | Consistência | A confidência de cada item é coerente com a fonte (🟢 para pedido explícito ou resposta do esclarecimento, 🟡 para inferência sobre spec planejada)?

### Cobertura

- [X] Q-011 | Cobertura | Todo RF tem ao menos um cenário Gherkin?
- [X] Q-012 | Cobertura | Toda RN alterada cita a regra original nas specs de `_reversa_sdd/` (não há `domain.md` neste projeto)?

### EdgeCases

- [X] Q-013 | EdgeCases | Limites numéricos têm valor concreto (100 ms, 1 s, 0,2 s, 60 s, 20 pedidos)?
- [ ] Q-014 | EdgeCases | Estados vazios, nulos e iniciais estão considerados, inclusive o áudio sem duração conhecida?
- [X] Q-015 | EdgeCases | Concorrência (fila, novo clique), nova tentativa e tempo esgotado estão considerados?

### Jargão

- [ ] Q-016 | Jargão | Um humano novo no time entende todos os termos sem glossário externo?
- [X] Q-017 | Jargão | Siglas são expandidas na primeira ocorrência (PRD)?

### SoluçãoImplícita

- [X] Q-018 | SoluçãoImplícita | Os RF, RN e RNF descrevem o quê, não o como? (Os nomes de arquivo e função ficam restritos às "Constatações no código vigente", que são contexto.)
- [X] Q-019 | SoluçãoImplícita | Não há nome de biblioteca ou framework? (WhatsApp e Chrome são a plataforma do produto.)

### Princípios

- [X] Q-020 | Princípios | Há conflito com `.reversa/principles.md`? (Arquivo ausente; nada a violar.)

## Itens reprovados, detalhe

### Q-003

> motivo: o RF-05 pede o tempo total "com uma casa decimal" ("9,7 s"), e o RF-04 pede que tempos a partir de 60 s usem "1 min 05 s"; o texto não diz qual vale para um tempo total acima de um minuto.
> sugestão: no RF-05, "com uma casa decimal abaixo de 60 s e, a partir de 60 s, no formato do RF-04".

### Q-014

> motivo: nenhum RF diz o que o resumo exibe quando a duração do áudio é desconhecida, nem se esse pedido entra no acumulado; o roadmap decide (D-08), mas o requisito não.
> sugestão: acrescentar ao RF-05 "sem duração conhecida, o resumo omite '· áudio de'" e à RN-07 "pedidos sem duração ficam de fora".

### Q-016

> motivo: "cache da sessão" aparece em RN-04, RN-07 e RF-09 sem definição no glossário da seção 3.
> sugestão: definir na seção 3 "cache da sessão: memória da aba que guarda as transcrições já feitas, para reexibi-las sem transcrever de novo".

## Veredito

**Aprovado com ressalvas**

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-01 | Auditoria gerada por `/reversa-quality` | reversa |
