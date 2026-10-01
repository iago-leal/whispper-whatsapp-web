# Contrato da Porta VerificadorDeSistema

**Componente:** `compatibilidade-instalacao`
**Arquivo correspondente:** `extension/src/dominio/compatibilidade.ts`

---

## Assinatura TypeScript

```typescript
export interface VerificadorDeSistema {
  obterInfoHardware(): Promise<InfoHardwareInicial>;
  avaliarCompatibilidade(info: InfoHardwareInicial): ResultadoVerificacaoInicial;
}
```

## Requisitos de Avaliação
1. macOS: exige arquitetura Apple Silicon (`arm64`) e RAM ≥ 8 GB.
2. Windows: exige arquitetura de 64 bits (`x86_64`) e RAM ≥ 8 GB.
3. Linux/Outro: incompatível na primeira versão de distribuição.
