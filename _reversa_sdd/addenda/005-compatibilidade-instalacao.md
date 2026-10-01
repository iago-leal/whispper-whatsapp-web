# Adendo: Compatibilidade e Instalação Guiada

> Identificador: `005-compatibilidade-instalacao`
> Data: 2026-10-01
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-01.

## Resumo da entrega

Implementação do sistema de compatibilidade prévia e instalação guiada da extensão Whispper. A solução viabiliza a adoção por usuários leigos através de uma página de boas-vindas estruturada em seis etapas: transparência de privacidade e conformidade local, verificação automática de hardware antes de qualquer download (macOS Apple Silicon ou Windows 64 bits com ≥ 8 GB RAM), oferta de instalador no escopo do usuário sem exigir senha de administrador, polling a cada 3 s para detecção do aplicativo auxiliar, verificação do modelo Whisper e execução de teste com áudio sintético em português. Adicionalmente, foi incluído atalho para verificação de compatibilidade no painel da extensão e scripts de instalação e desinstalação para o usuário local. Total de 8 ações concluídas e validadas por 83 testes unitários no ecossistema da extensão e 121 testes no aplicativo auxiliar.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/prd.md` | `## 4. Escopo (in)` | componente-novo | Instalação guiada sem terminal, página de boas-vindas e verificação de compatibilidade implementadas. |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md` | `## 6. Requisitos Funcionais` | componente-novo | Módulos `compatibilidade.ts`, `onboarding.ts`, UI em `onboarding/index.html` e scripts de usuário implementados. |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md` | `## 8. Design e Interface` | componente-novo | Página de boas-vindas com seis etapas e integração com `chrome.runtime.onInstalled` e popup da extensão. |

## Regras sob vigilância

IDs dos itens sob vigilância conforme [_reversa_forward/005-compatibilidade-instalacao/regression-watch.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/005-compatibilidade-instalacao/regression-watch.md):
- W401, W402, W403, W404

## Fontes

- `_reversa_forward/005-compatibilidade-instalacao/requirements.md`
- `_reversa_forward/005-compatibilidade-instalacao/roadmap.md`
- `_reversa_forward/005-compatibilidade-instalacao/actions.md`
- `_reversa_forward/005-compatibilidade-instalacao/legacy-impact.md`
- `_reversa_forward/005-compatibilidade-instalacao/regression-watch.md`
- `_reversa_forward/005-compatibilidade-instalacao/progress.jsonl`
