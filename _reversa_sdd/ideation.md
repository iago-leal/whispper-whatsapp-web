# Ideation, whispper-whatsapp-web

> Selo 🟡 PLANEJADO em todos os itens, sujeito a validação.

## Brief original
gostaria de utilizar o whispper para, no whatsapp-web, transcrever áudios. Odeio ter de ouvi-los. Pessoas prolixas são as que mais mandam áudio, picados ainda por cim. Minha ideia seria criar uma extensão para algum desses navegadores (safari, firefox ou chrome). Não sei como é, mas a extensão pediria para ver os componentes da máquina do usário para ver se é possível instalar whispper nela. Inicialmente, gostaria de que aparecesse um pequeno ícone de transcrição nas mensagem de áudio. A transcrição seria feita e apareceria numa janelinha flutuante que deriva do próprio áudio. É para ser possível abrir mais de uma janelinha, pois pessoas mandam audios fragmentados.

## Problema
🟡 Ouvir áudios do WhatsApp consome tempo e atenção, sobretudo quando vêm de remetentes prolixos que fragmentam uma mesma fala em vários áudios curtos. No uso do WhatsApp Web no computador, o problema aparece em quatro situações:

- no trabalho, com o WhatsApp Web aberto ao lado de outras tarefas;
- em ambientes nos quais não se pode reproduzir som;
- quando é preciso localizar depressa uma informação no meio de um áudio;
- quando as mensagens de áudio se acumulam.

Quem sente o problema é, em primeiro lugar, o próprio usuário (iago); em seguida, potencialmente, outros usuários do WhatsApp Web, se o produto for distribuído.

## Valor entregue
🟡 Ler em segundos, e em silêncio, o conteúdo de uma sequência de áudios, sem precisar ouvi-los.

## Alternativas existentes
🟡 Três alternativas, nenhuma suficiente:

- **Transcrição nativa do WhatsApp:** existe nos aplicativos de celular, mas não no WhatsApp Web (informação do usuário).
- **Fluxo manual atual do usuário:** baixar o áudio e rodar o Whisper na própria máquina. Funciona e mantém o áudio local, mas exige vários passos manuais a cada áudio.
- **Extensões de terceiros e bots de transcrição:** citados pelo agente como categoria, não avaliados pelo usuário nem verificados. Em geral enviam o áudio para a nuvem, o que o fluxo atual do usuário evita.

Consequência: o produto não cria uma capacidade nova; automatiza um fluxo que o usuário já pratica e valida, preservando a transcrição local.

## Público-alvo (bruto)
🟡 Quem usa o WhatsApp Web no computador, recebe muitos áudios e prefere ler a ouvir, a começar pelo próprio usuário.

O público inclui tanto usuários leigos quanto técnicos; como tornar a instalação acessível a leigos fica para uma etapa posterior. A prioridade é o uso pessoal imediato, com a distribuição como horizonte.

## Métricas de sucesso
🟡 Horizonte de três meses. As quatro métricas foram aceitas pelo usuário:

| Dimensão | Métrica | Unidade | Alvo |
|---|---|---|---|
| Adoção | Áudios recebidos lidos em vez de ouvidos | % | ≥ 90% |
| Latência | Tempo entre o clique no ícone e o texto na janela | s por minuto de áudio | ≤ 10 s/min |
| Esforço | Passos manuais para transcrever um áudio | passos | 1 clique (hoje, cerca de 5) |
| Qualidade | Transcrições compreendidas sem precisar ouvir o áudio | % | ≥ 95% |

🟡 [INDEFINIDO, validar com usuário] Forma de coletar as métricas de adoção e de qualidade (registro automático, amostragem manual ou percepção).

## Premissas a validar
🟡 Duas premissas cuja falha inviabiliza o projeto:

1. **Acesso ao áudio:** a extensão consegue obter o áudio já decifrado que a página do WhatsApp Web carrega, e a interface da página muda pouco o bastante para o ícone de transcrição continuar aparecendo nas mensagens.
2. **Ponte até o Whisper local:** existe caminho viável para a extensão acionar o Whisper, já que, sozinha, uma extensão de navegador não executa programas na máquina e só enxerga parte do hardware. Caminhos conhecidos: um aplicativo auxiliar instalado à parte, que conversa com a extensão por *Native Messaging* e roda o Whisper com desempenho pleno; ou o Whisper executado dentro do próprio navegador (WebGPU ou WebAssembly), sem instalação, porém mais lento e com modelos menores.

## Notas
🟡 **Hardware e requisitos mínimos.** O desempenho em hardware comum foi descartado como premissa fatal: o produto declarará requisitos mínimos. O alvo inicial é o Mac com Apple Silicon, mas computadores sem Apple Silicon devem ser contemplados no desenho desde o início.

🟡 **Diretriz arquitetural do usuário.** O projeto deve ter alta coesão e baixo acoplamento entre componentes, com arquitetura de portas e adaptadores (hexagonal). Pontos candidatos a porta, sugeridos pelo agente e a validar:

- **Motor de transcrição:** um adaptador por implementação (por exemplo, mlx-whisper para Apple Silicon, whisper.cpp ou faster-whisper para as demais plataformas, Whisper no navegador), o que acomoda os requisitos mínimos e a expansão para além do Apple Silicon.
- **Integração com o WhatsApp Web:** isola a leitura da página e a inserção do ícone, de modo que mudanças na interface do WhatsApp afetem um único adaptador (mitigação da premissa 1).
- **Navegador:** isola as diferenças entre Chrome, Firefox e Safari.

🟡 **Verificação de compatibilidade.** O brief prevê que a extensão examine a máquina para saber se é possível instalar o Whisper. Como a extensão só enxerga parte do hardware, a verificação completa depende do caminho escolhido na premissa 2 (o aplicativo auxiliar pode inspecionar a máquina inteira).

🟡 **Interface desejada (do brief).** Um pequeno ícone de transcrição em cada mensagem de áudio; a transcrição aparece numa janela flutuante ancorada ao próprio áudio; várias janelas podem ficar abertas ao mesmo tempo, para acompanhar áudios fragmentados.

🟡 [INDEFINIDO, validar com usuário] Navegador inicial: o brief cita Safari, Firefox e Chrome, sem escolha.

🟡 **Grafia.** "whispper", no brief e no nome do projeto, refere-se ao modelo de reconhecimento de fala Whisper, da OpenAI.

---
Gerado por reversa-ideator em 2026-09-30T13:36:41-03:00
Fonte: newproject-brief.md
