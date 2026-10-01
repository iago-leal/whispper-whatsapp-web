# Whispper: Sistema de Janelas Flutuantes

O subsistema de janelas flutuantes provê a camada visual de apresentação de transcrições dentro do WhatsApp Web, ancorada dinamicamente a cada balão de áudio.

## Arquitetura de Componentes

```
src/content/
├── janela-elemento.ts         # Construção DOM da janela (cabeçalho, corpo, rodapé, copiar)
├── posicionador-colisoes.ts   # Algoritmo de ancoragem e prevenção de colisão vertical
├── gerenciador-janelas.ts     # Orquestrador da coleção (até 20 janelas) e ciclo de vida
└── janela-flutuante.css       # Estilos isolados com suporte a tema claro e escuro
```

## Algoritmo de Prevenção de Colisão
Para evitar sobreposição entre áudios enviados em sequência:
1. As mensagens são ordenadas pela posição vertical (`y`) de seus balões.
2. Cada janela recebe sua coordenada ideal adjacente ao balão.
3. Se o topo de uma janela interceptar a anterior, ela é empurrada para baixo com um espaçamento mínimo de 8 px.
4. Caso a largura disponível lateralmente seja inferior a 320 px, a janela posiciona-se logo abaixo do balão.

## Acessibilidade e Teclado
- Foco gerenciável com `tabindex`.
- A tecla `Esc` fecha a janela ativa.
- Botão "Copiar" com anúncio visual e suporte à API `navigator.clipboard`.
