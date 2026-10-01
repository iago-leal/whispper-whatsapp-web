# Data Delta — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Data:** 2026-10-01

---

## 1. Modelo de Domínio (Compatibilidade)

```typescript
export type PlataformaSO = 'macOS' | 'Windows' | 'Linux' | 'outro';
export type ArquiteturaCPU = 'arm64' | 'x86_64' | 'outro';

export interface InfoHardwareInicial {
  plataforma: PlataformaSO;
  arquitetura: ArquiteturaCPU;
  memoriaTotalGB: number;
}

export interface RequisitoNaoAtendido {
  requisito: string;
  exigido: string;
  encontrado: string;
}

export interface ResultadoVerificacaoInicial {
  compativel: boolean;
  requisitosNaoAtendidos: RequisitoNaoAtendido[];
}

export type EtapaOnboarding =
  | 'privacidade'
  | 'verificacao'
  | 'instalador'
  | 'modelo'
  | 'teste'
  | 'pronto';
```

## 2. Persistência Local (chrome.storage.local)

Chave: `whispper_onboarding`
```json
{
  "etapaConcluida": "privacidade",
  "dataInstalacao": "2026-10-01T12:00:00.000Z"
}
```
