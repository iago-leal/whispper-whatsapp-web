# Prova de Conceito: Latência do Motor Local (Portão T025)

> Feature: `001-motor-transcricao-local`
> Data: 2026-10-01
> Status: Deferido para ambiente real com Apple Silicon e amostras privadas do usuário.

## 1. Contexto

O portão T025 prevê a aferição de latência com dez amostras reais em `amostras/reais/`.
Em conformidade com a nota de execução de `actions.md`:
- O diretório `amostras/reais/` não é versionado por motivos de privacidade.
- A validação preliminar foi conduzida sobre a suíte sintética (`amostras/sinteticas/`), onde 6 de 6 arquivos atenderam ao teto de processamento (folga de 50 a 150 ms nos áudios de 13 s; carregamento com aquecimento em ~3,6 s e pico de memória do processo trabalhador em 2,35 GiB).

## 2. Decisão

A execução do portão com pesos reais do modelo Whisper (`large-v3-turbo` ou `small`) via `mlx-whisper` foi deferida para ser disparada localmente pelo usuário quando `WHISPPER_PYTHON` estiver apontado para o interpretador com Metal/MLX configurado.
O fluxo de desenvolvimento da extensão e dos adaptadores prosseguiu desacoplado por contratos explícitos.
