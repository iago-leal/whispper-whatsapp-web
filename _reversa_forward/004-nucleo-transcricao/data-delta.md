# Data Delta — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Data:** 2026-10-01

---

## 1. Entidades em Memória (Sessão da Aba)

### PedidoTranscricao
```typescript
export type EstadoPedido = 'na_fila' | 'transcrevendo' | 'concluido' | 'erro';

export interface PedidoTranscricao {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
  estado: EstadoPedido;
  criadoEm: number; // timestamp ms
  texto?: string;
  idioma?: string;
  erro?: 'MOTOR_INDISPONIVEL' | 'AUDIO_INDISPONIVEL' | 'TEMPO_ESGOTADO' | 'FALHA_NA_TRANSCRICAO' | 'VERSAO_INCOMPATIVEL';
  motivoErro?: string;
}
```

### ClassificacaoNaSessao
```typescript
export interface ClassificacaoNaSessao {
  idAudio: string;
  classe: 'lido' | 'ouvido';
  tocadoAposLeitura: boolean;
}
```

---

## 2. Entidade Persistida (Armazenamento Local)

Único dado gravado em disco (via `chrome.storage.local`), anônimo, sem identificador de áudio, contato, mensagem ou conversa:

```typescript
export interface ContadoresPersistidos {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string; // ISO 8601 (ex: "2026-10-01T12:00:00.000Z")
}
```

### Métricas Derivadas (Exibidas no Painel)
- **Adoção (%):** `lidos / (lidos + ouvidos) * 100` (arredondado para inteiro). Se denominador for 0, retorna `null` ("Sem dados ainda").
- **Qualidade (%):** `(lidos - lidosETocados) / lidos * 100` (arredondado para inteiro). Se `lidos` for 0, retorna `null`.
