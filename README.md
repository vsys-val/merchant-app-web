# Merchant App Web

[![Frontend CI](https://github.com/vsys-val/merchant-app-web/actions/workflows/ci.yml/badge.svg)](https://github.com/vsys-val/merchant-app-web/actions/workflows/ci.yml)

Frontend responsivo e instalável do [Merchant App](https://merchant-app-web.onrender.com), um guia comunitário para consultar experiências objetivas sobre produtos e lembrar o que vale — ou não — comprar novamente.

## Funcionalidades

- Cadastro, login, persistência de sessão e saída.
- Busca por nome, marca ou código de barras, com paginação.
- Detalhe do produto com indicadores da comunidade.
- Cadastro de produtos com categoria, quantidade, unidade e GTIN opcional.
- Criação, edição e exclusão da avaliação pessoal.
- Área do usuário com produtos cadastrados e avaliações próprias.
- URLs compartilháveis e rotas protegidas.
- PWA com manifesto, instalação e fallback offline básico.
- Interface responsiva, navegação por teclado e modais acessíveis.

## Stack

- React 19 e TypeScript.
- Vite 7.
- Vitest 5 para testes unitários e de componentes.
- Playwright para fluxos ponta a ponta em desktop e celular.
- GitHub Actions para integração contínua.
- Render para hospedagem e deploy contínuo.

O frontend consome uma API FastAPI separada e não acessa o banco diretamente. O backend está em [vsys-val/fastapi-merchant-app](https://github.com/vsys-val/fastapi-merchant-app).

## Executar localmente

Requisitos: Node.js 22 e npm.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

`VITE_API_URL` define a origem da API. O arquivo de exemplo aponta para a API pública.

## Verificações

```bash
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes E2E interceptam a API e usam dados simulados: não criam registros no ambiente publicado. O CI executa testes unitários, E2E, verificação de tipos e build em todo pull request e em alterações da `main`.

## Rotas

| Rota | Acesso | Função |
|---|---|---|
| `/` | Público | Busca e catálogo |
| `/products/:id` | Público | Detalhe e avaliações |
| `/products/new` | Autenticado | Cadastro de produto |
| `/account` | Autenticado | Produtos e avaliações do usuário |

## Organização

| Caminho | Responsabilidade |
|---|---|
| `src/features/auth` | Autenticação e sessão |
| `src/features/products` | Busca, detalhe, cadastro e avaliações |
| `src/features/account` | Área pessoal |
| `src/lib` | HTTP, roteamento e comportamento compartilhado |
| `e2e` | Fluxos reais de navegador com API simulada |
| `public` | Manifesto, ícones e service worker |
| `.github/workflows` | Integração contínua |

Mais decisões estão em [docs/architecture.md](docs/architecture.md).

## Limites atuais

- Não há recuperação de senha, edição de perfil ou imagens de produtos.
- Produtos não podem ser editados ou excluídos pela interface.
- O modo offline cobre o shell já visitado; operações e dados dependem da API.
- A sessão usa token no `localStorage`, uma opção simples para o MVP que exige disciplina contra XSS e deve ser reavaliada antes de ampliar o risco da aplicação.

## Colaboração e segurança

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de mudanças e [SECURITY.md](SECURITY.md) para relatar vulnerabilidades. O histórico de versões fica em [CHANGELOG.md](CHANGELOG.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
