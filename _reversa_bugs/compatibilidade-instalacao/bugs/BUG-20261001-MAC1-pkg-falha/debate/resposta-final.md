# Recomendação do Juiz
Avaliando as propostas finais, os agentes convergiram perfeitamente. 

**Vencedora (Síntese da Convergência)**: 
1. Criar um script `auxiliar/ferramentas/gerar_pkg.sh` que usa o `pkgbuild` nativo para empacotar o motor. 
2. O pacote instalará na pasta de Application Support do usuário (atendendo o RF-07 de rodar sem senha de admin).
3. Atualizar o arquivo `dominio/compatibilidade.ts` (ou a UI correspondente) substituindo o link local corrompido (`#download-...`) por um link de download real, como do GitHub Releases (a ser configurado na Spec pelo OQ-03).
4. Deixar a assinatura/notarização fora deste change set local, pendente de infra de CI.

**Justificativa (Rubrica)**: O risco é o menor possível, a aderência com a spec é garantida ao se mirar a instalação sem privilégios e a viabilidade é imediata sem depender de servidores novos hoje.
