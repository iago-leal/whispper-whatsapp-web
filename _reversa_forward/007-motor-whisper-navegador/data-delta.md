# Data delta: Motor de transcrição no navegador

> Identificador: `007-motor-whisper-navegador`
> Data: `2026-10-04`
> Base: modelos de dados das specs (`_reversa_sdd/sdd/motor-transcricao-local.md#9`, `compatibilidade-instalacao.md#9`, `nucleo-transcricao.md#9`) e o código em `extension/src/dominio/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

Nenhum dado do usuário passa a ser guardado: áudio e texto continuam só na memória do pedido (RF-11). O que entra é dado técnico: o catálogo embutido, os arquivos de pesos e números de desempenho.

## 1. Entidades novas

### 1.1 `CatalogoDeModelos` 🟡

Dado puro, embutido no pacote em `extension/src/dominio/catalogo-modelos.ts`. Atualizar um modelo é publicar outra versão da extensão.

```
CatalogoDeModelos {
  versao: inteiro                       // começa em 1
  padrao: idModelo                      // fixado pela Fase 0 (RF-05)
  padraoSemAceleracao: idModelo | nulo  // nulo quando a Fase 0 reprova o WASM (RF-15)
  modelos: lista de ModeloDoCatalogo
}

ModeloDoCatalogo {
  id: texto                             // ex.: "whisper-small-q4"
  rotulo: texto                         // nome exibido no painel, ex.: "Whisper small"
  repositorio: texto                    // ex.: "onnx-community/whisper-small"
  revisao: texto                        // hash completo do commit, nunca "main"
  dispositivo: "webgpu" | "wasm"
  precisao: { encoder_model: texto, decoder_model_merged: texto }
  arquivos: lista de { caminho: texto, bytes: inteiro, sha256: texto }   // inclui tokenizador e configurações
  bytesTotais: inteiro                  // soma de arquivos[].bytes
  memoriaMinimaGB: número               // fixada pela Fase 0
}
```

- Regra: o `id` muda sempre que a revisão ou a precisão mudarem, para que um modelo novo nunca reaproveite arquivos de outro.
- Regra: só modelos com `dispositivo: "wasm"` podem ser `padraoSemAceleracao`.

### 1.2 Arquivos de pesos no OPFS 🟡

Na origem `chrome-extension://<id>`, comum ao service worker, às páginas e ao documento offscreen. Escrita só pelo worker do documento offscreen.

```
/modelos/<id>/<caminho do arquivo>            // arquivo completo e conferido
/modelos/<id>/<caminho do arquivo>.parcial    // download em curso; o tamanho é o ponto de retomada
/modelos/<id>/verificacao.json                // marca de verificação, gravada depois do SHA-256 conferir
```

```
MarcaDeVerificacao {                          // conteúdo de verificacao.json
  idModelo: texto
  revisao: texto
  arquivos: lista de { caminho, bytes, sha256, ultimaModificacao: inteiro }
  verificadoEm: data e hora ISO 8601
}
```

- O estado do modelo deriva só do OPFS, porque o documento offscreen não tem `chrome.storage`:
  - **ausente**: sem pasta;
  - **baixando**: há algum `.parcial`;
  - **verificado**: há `verificacao.json` coerente com o catálogo;
  - **corrompido**: tamanho, hash ou data divergente.
- `ultimaModificacao` só é usado se a Fase 0 adotar a conferência rápida (D-07, alternativa); no caminho principal, o hash é recalculado a cada carga.
- Pastas de modelos que não estão mais no catálogo são apagadas na primeira carga depois de uma atualização da extensão.

### 1.3 `LinhaDoRegistroDeDesempenho` 🟡

Em `chrome.storage.local`, chave `whispper_registro_desempenho`, gravada só pelo service worker (D-14). Lista de no máximo 1 000 linhas; ao passar do limite, saem as mais antigas.

```
LinhaDoRegistroDeDesempenho {
  instante: data e hora ISO 8601
  duracaoAudioSeg: número | nulo
  processamentoMs: inteiro | nulo
  carregamentoMs: inteiro               // 0 quando o modelo já estava carregado (RF-12)
  modelo: texto                         // id do catálogo ou modelo informado pelo auxiliar
  origem: "navegador" | "auxiliar"
  resultado: "ok" | CodigoDeErroDoMotor | "CANCELADO"
}
```

- Nenhum campo de texto livre vindo do áudio. Os motivos de erro não entram, porque podem citar o conteúdo.
- Exportação: CSV com cabeçalho `instante;duracao_audio_s;processamento_ms;carregamento_ms;modelo;origem;resultado`, separador ponto e vírgula e vírgula decimal, gerado no painel.

### 1.4 `ConfiabilidadeDoDispositivo` 🟡

Em `chrome.storage.local`, chave `whispper_dispositivo`, gravada pela página de boas-vindas no teste de sanidade (D-17) e lida pelo service worker antes de pedir a carga ao documento offscreen.

```
ConfiabilidadeDoDispositivo {
  webgpuConfiavel: booleano | nulo      // nulo antes do primeiro teste
  idModeloTestado: texto
  testadoEm: data e hora ISO 8601
}
```

## 2. Entidades alteradas

### 2.1 Porta `MotorDeTranscricao` (`extension/src/dominio/motor-de-transcricao.ts`) 🟡

```diff
 export type EstadoDoMotor =
-  | { estado: "pronto"; modelo: string; versaoApp: string; protocolo: number }
-  | { estado: "iniciando"; modelo?: string; versaoApp?: string; protocolo?: number }
+  | { estado: "pronto"; modelo: string; versaoApp: string; protocolo: number; origem?: OrigemDoMotor }
+  | { estado: "iniciando"; modelo?: string; versaoApp?: string; protocolo?: number; origem?: OrigemDoMotor }
   | { estado: "indisponivel"; codigo: …; motivo: string; instrucao?: string };

+export type OrigemDoMotor = "auxiliar" | "navegador";
+
 export type ResultadoDaTranscricao =
-  | { ok: true; texto: string; idioma: string; duracaoAudioSeg: number; processamentoMs: number }
+  | { ok: true; texto: string; idioma: string; duracaoAudioSeg: number; processamentoMs: number;
+      origem?: OrigemDoMotor; modelo?: string; carregamentoMs?: number }
   | { ok: false; codigo: CodigoDeErroDoMotor; motivo: string; instrucao?: string };

+export interface OpcoesDaTranscricao { sinal?: AbortSignal }
+
 export interface MotorDeTranscricao {
   verificar(): Promise<EstadoDoMotor>;
-  transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao>;
+  transcrever(audio: Uint8Array, tipoDeMidia: string, opcoes?: OpcoesDaTranscricao): Promise<ResultadoDaTranscricao>;
 }
```

- No motor no navegador, `versaoApp` é a versão da extensão e `protocolo` é a versão do protocolo do documento offscreen.
- Pedido cancelado devolve `{ ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "cancelado" }`; o núcleo já o descartou, e o registro marca `CANCELADO`.

### 2.2 Porta `ExibicaoDeTranscricao` (`extension/src/dominio/exibicao-de-transcricao.ts`) 🟡

```diff
-  | { tipo: 'transcrevendo'; inicioEsperaEm: number }
+  | { tipo: 'transcrevendo'; inicioEsperaEm: number; preparando?: boolean }
```

### 2.3 `ItemFila` (`extension/src/dominio/fila-transcricao.ts`) 🟡

- Sem campo novo. A fila ganha a operação `reiniciarPrazo(idAudio)`, que recalcula o prazo do RF-11 do núcleo a partir do envio ao motor (D-11).
- O núcleo guarda, fora do item, um mapa `idAudio → AbortController`, criado no envio e abortado no tempo-limite, no descarte e no fechamento da janela de um pedido em andamento.

### 2.4 `RequisitosMinimos` (`compatibilidade-instalacao.md#9`; `extension/src/dominio/compatibilidade.ts`) 🟡

```diff
 RequisitosMinimos {
   plataforma: macOS | Windows
   processador: Apple Silicon | x86-64
   memoriaTotalGB: número
-  discoLivreGB: número
-  adaptador: mlx-whisper | adaptador para máquinas sem Apple Silicon (OQ-02)
+  espacoParaModeloMB: número           // bytesTotais do modelo padrão + 20% de folga
+  aceleracaoGrafica: exigida | dispensavel   // dispensável só com padraoSemAceleracao no catálogo
+  versaoMinimaDoChrome: 127
 }
```

| Plataforma | Processador | Memória total | Espaço | Aceleração |
|------------|-------------|---------------|--------|------------|
| Windows 10 ou 11, 64 bits | x86-64 | Fase 0 (proposta: 8 GB) | modelo padrão + 20% | conforme RF-15 |
| macOS | Apple Silicon | Fase 0 (proposta: 8 GB) | modelo padrão + 20% | conforme RF-15 |

### 2.5 `ResultadoDaVerificacao` e `InfoHardwareInicial` 🟡

```diff
 InfoHardwareInicial {
   plataforma: PlataformaSO
   arquitetura: ArquiteturaCPU
   memoriaTotalGB: number
+  windows64Bits: boolean | null        // userAgentData.bitness
+  espacoDisponivelMB: number | null    // storage.estimate(): quota menos usage
+  adaptadorGrafico: { disponivel: boolean; fabricante?: string; shaderF16?: boolean }
+  versaoDoChrome: number
 }

 ResultadoVerificacaoInicial {
   compativel: boolean
   requisitosNaoAtendidos: RequisitoNaoAtendido[]
-  instaladorSugerido?: { nome; arquivo; plataforma }
+  modoDoMotor?: "webgpu" | "wasm"      // o que a extensão vai usar neste computador
 }
```

- A coleta passa a ser assíncrona: `obterInfoHardware()` da porta `VerificadorDeSistema`, definida em `_reversa_forward/005-compatibilidade-instalacao/interfaces/porta-verificador-sistema.md`, volta a ter a assinatura assíncrona prevista ali.

### 2.6 `ProgressoDaInstalacao` (chave `whispper_onboarding`) 🟡

```diff
 ProgressoDaInstalacao {
-  etapaAtual: privacidade | verificacao | aplicativo | modelo | teste | pronto      // 1 a 6
+  etapa: privacidade | verificacao | modelo | teste | pronto                       // 1 a 5
+  consentimentoEm: data e hora ISO 8601 | nulo   // aceite do aviso de privacidade (D-16)
   atualizadoEm: data e hora ISO 8601
 }
```

## 3. Entidades removidas ou sem uso

- `ResultadoVerificacaoInicial.instaladorSugerido` e os nomes de arquivo `whispper-macos-apple-silicon.pkg` e `whispper-windows-x64.exe`: o leigo não instala programa (RN-02).
- `dist/instaladores/` deixa de ser gerado pelo `npm run build` e nunca entra no pacote da loja.
- `ConfiguracaoDoAuxiliar` e o `RegistroDeDesempenho` do auxiliar (`motor-transcricao-local.md#9`) seguem como estão, só no Mac do usuário técnico.

## 4. Migrações necessárias

1. **`whispper_onboarding` com 6 etapas.** Na leitura, a etapa salva é remapeada: 1→1, 2→2, 3→3, 4→3, 5→4, 6→5. A etapa 3 antiga (aplicativo) leva ao preparo do modelo, que é o passo pendente no fluxo novo. A gravação seguinte já usa a escala nova.
2. **Troca do ID da extensão** (D-19). O armazenamento pertence ao ID; no Chrome do autor, a instalação com o `key` da loja começa sem contadores, sem etapa salva e sem modelo. Não há migração automática entre IDs, e os contadores atuais não são transferidos; a decisão foi registrada no `roadmap.md`, seção 8.
3. **Modelos órfãos.** Na primeira carga depois de uma atualização, o documento offscreen apaga de `/modelos/` as pastas cujo `id` não está no catálogo.
4. **Contadores do painel** (`whispper_contadores`): sem mudança de formato.
