# Merchant App Web

[![Frontend CI](https://github.com/vsys-val/merchant-app-web/actions/workflows/ci.yml/badge.svg)](https://github.com/vsys-val/merchant-app-web/actions/workflows/ci.yml)

Frontend responsivo e instalável do [Merchant App](https://merchant-app-web.onrender.com), um guia comunitário para consultar experiências objetivas sobre produtos e lembrar o que vale — ou não — comprar novamente.

## Produto

O Merchant responde, no corredor do mercado, à pergunta *"eu compraria isto de novo?"*. Ele mostra a experiência do próprio usuário em destaque e a da comunidade ao lado, com avaliações estruturadas em vez de notas.

| Documento | Onde |
|---|---|
| Visão de produto, personas e métricas | [visao-produto.md](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/visao-produto.md) |
| Histórias de usuário e critérios de aceite | [historias-usuario.md](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/historias-usuario.md) |
| Decisões de produto (ADRs) | [decisoes/](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/README.md) |
| Rastreabilidade requisito → teste → tela | [rastreabilidade.md](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/rastreabilidade.md) |
| **Jornadas, telas e decisões de UX** | [docs/jornadas-e-telas.md](docs/jornadas-e-telas.md) |

## Funcionalidades

- Cadastro com confirmação de e-mail por código, login, recuperação de senha, persistência de sessão e saída.
- Busca combinando nome, marca e categoria, ou por código de barras, com paginação e filtros na URL.
- Detalhe do produto com indicadores da comunidade.
- Cadastro de produtos com categoria, quantidade, unidade e GTIN opcional.
- Criação, edição e exclusão da avaliação pessoal.
- Área do usuário com produtos cadastrados e avaliações próprias.
- Painel administrativo com métricas de uso, catálogo, operação da API e erros do navegador.
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
npm run test:e2e:production # requer PLAYWRIGHT_BASE_URL
```

Os testes E2E locais interceptam a API e usam dados simulados: não criam registros no ambiente publicado. O CI executa testes unitários, E2E, verificação de tipos e build em todo pull request e em alterações da `main`.

Depois de um merge, o job `production-smoke` espera o Render expor em `build-info.json` exatamente o SHA enviado à `main`. Em seguida, valida a API e a jornada pública na URL de produção em Desktop Chrome e Pixel 7. Falhas preservam screenshots e traces como artefatos do GitHub Actions.

## Rotas

| Rota | Acesso | Função |
|---|---|---|
| `/` | Público | Início e lembranças pessoais |
| `/search` | Público | Busca e catálogo; aceita `name`, `brand`, `category`, `barcode` e `page` na query |
| `/products/:id` | Público | Detalhe e avaliações |
| `/products/new` | Autenticado | Cadastro de produto |
| `/products/:id/edit` | Autenticado | Correção de produto próprio, enquanto ninguém mais o avaliou |
| `/account` | Autenticado | Produtos e avaliações do usuário |
| `/admin` | Administração | Painel com o estado geral do produto; o acesso é definido por `ADMIN_EMAILS` na API |

## Organização

| Caminho | Responsabilidade |
|---|---|
| `src/features/auth` | Autenticação e sessão |
| `src/features/products` | Busca, detalhe, cadastro e avaliações |
| `src/features/account` | Área pessoal |
| `src/features/admin` | Painel administrativo e gráficos acessíveis |
| `src/lib/analytics.ts` | Eventos de uso em lote, sem dados pessoais |
| `src/lib` | HTTP, roteamento e comportamento compartilhado |
| `e2e` | Fluxos reais de navegador com API simulada |
| `public` | Manifesto, ícones e service worker |
| `.github/workflows` | Integração contínua |

Mais decisões estão em [docs/architecture.md](docs/architecture.md). A relação entre telas, histórias e requisitos está em [docs/jornadas-e-telas.md](docs/jornadas-e-telas.md).

## Privacidade das métricas

A interface envia eventos de uso para a própria API, sem ferramentas de terceiros. Os eventos nunca contêm texto digitado, e-mail ou query string. Nada é enviado com *Do Not Track*, em navegadores automatizados (testes) nem fora do build de produção. Detalhes em [ADR-0012](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0012-painel-e-instrumentacao-propria.md).

## Limites atuais

- Não há edição de perfil nem imagens de produtos. Confirmação de conta e recuperação de senha dependem de o backend ter um provedor de e-mail configurado.
- Produtos podem ser corrigidos pelo responsável, mas ainda não excluídos pela interface.
- O modo offline cobre o shell já visitado; operações e dados dependem da API.
- A sessão usa token no `localStorage`, uma opção simples para o MVP que exige disciplina contra XSS e deve ser reavaliada antes de ampliar o risco da aplicação.

## Colaboração e segurança

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de mudanças e [SECURITY.md](SECURITY.md) para relatar vulnerabilidades. O histórico de versões fica em [CHANGELOG.md](CHANGELOG.md).

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
