# Protótipo mobile do Merchant

Esta prévia transforma a direção visual escolhida em um fluxo interativo separado, com dados locais, para comparação e testes de estados extremos.

## Integração na aplicação

A direção validada já foi incorporada à aplicação principal. As rotas `/`, `/search`, `/products/:id`, `/account` e `/products/new` usam os contratos reais da API e compartilham a navegação mobile. A avaliação real também segue as três etapas da prévia: experiência, motivos e conferência.

## Executar

```bash
npm install
npm run prototype:dev
```

Abra `/mobile-preview.html`. O seletor superior permite verificar as larguras de 320, 360, 390 e 430 px.

## Fluxos disponíveis

- início autenticado e visitante;
- busca separada por nome, marca ou código;
- detalhe com e sem avaliação pessoal;
- cadastro de produto, validações e prevenção de duplicidade;
- avaliação em três etapas, com conferência antes da publicação;
- edição e exclusão da avaliação;
- Minhas avaliações e Meus produtos;
- sessão expirada, falha de conexão e falha de publicação.

Os controles no fim da página permitem simular falhas. Recarregar a página restaura os dados originais.

## Limites

As imagens de produtos foram recortadas da arte conceitual e existem apenas na prévia. A aplicação integrada usa placeholders até existir uma fonte própria de imagens do catálogo. Os controles de falha continuam exclusivos da prévia.
