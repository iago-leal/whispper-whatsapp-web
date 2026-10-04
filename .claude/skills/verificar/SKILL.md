---
name: verificar
description: Roda a verificação completa do whispper-whatsapp-web com os interpretadores certos (typecheck da extensão, node --test, ruff e pytest do auxiliar no Python do python.org, build com instalador .pkg) e resume o resultado por etapa. Use antes de commit, antes de aceitação no WhatsApp real e ao fechar bug ou feature; aceita "rapido" para pular o build. E2E da instalação e motor real só sob pedido explícito.
argument-hint: "[rapido] [e2e] [real]"
---

# /verificar

Executa `scripts/verificar.sh` a partir da raiz do repositório e relata o resultado.

## Como chamar

| Argumento | Efeito |
|---|---|
| (nenhum) | typecheck, testes da extensão, ruff, pytest e build com carimbo |
| `rapido` | o mesmo, sem o build |
| `e2e` | acrescenta `WHISPPER_E2E=1`: **instala o aplicativo auxiliar de verdade na conta do usuário**; confirme com ele antes |
| `real` | acrescenta `MOTOR_REAL=1`: testes com o modelo Whisper real do cache local |

```bash
.claude/skills/verificar/scripts/verificar.sh            # completo
.claude/skills/verificar/scripts/verificar.sh rapido
WHISPPER_E2E=1 .claude/skills/verificar/scripts/verificar.sh
```

## O que o script sabe e você não precisa redescobrir

- O pytest roda no Python do python.org (`/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`), porque o `python3` do Homebrew não tem pytest nem mlx-whisper. `WHISPPER_PYTEST_PYTHON` troca o interpretador.
- Os testes de navegador da extensão usam o Chrome for Testing do cache do Playwright; sem ele, são pulados, não reprovados.
- O build gera `extension/dist/carimbo-build.txt` com hora, commit e aviso de alterações não commitadas. A aceitação no WhatsApp real cita esse carimbo, e não uma hora de memória.
- As etapas rodam todas mesmo que uma falhe; a saída mostra o resumo de cada uma e, nas falhas, só o trecho útil. O registro completo fica na pasta temporária impressa no fim.

## Como relatar

Cole o bloco de resumo tal como sai. Para cada falha, diga se ela já existia antes da sua alteração (rode `git stash` e repita só a etapa, se houver dúvida) ou se é nova. Teste de tempo que falha uma vez e passa na seguinte é instabilidade, não regressão, mas deve ser dito como tal, nunca omitido.
