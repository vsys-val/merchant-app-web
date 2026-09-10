# Arquitetura inicial do frontend

## Objetivo

Entregar uma aplicação web responsiva, mobile-first e instalável como PWA, consumindo a API FastAPI já publicada.

## Separação de responsabilidades

- `src/lib`: integração HTTP e detalhes externos.
- componentes de interface: apresentação e interação.
- páginas (próxima entrega): composição dos fluxos de negócio.
- API FastAPI: autenticação, validação e persistência.

## Configuração

A URL da API vem de `VITE_API_URL`. Em desenvolvimento, copie `.env.example` para `.env.local`.

## Próximos módulos

1. autenticação;
2. busca e paginação de produtos;
3. detalhe e resumo comunitário;
4. cadastro e edição de produtos;
5. criação, edição e exclusão de avaliações;
6. manifesto, service worker e experiência PWA.
