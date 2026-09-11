# Merchant App Web

Frontend web responsivo e instalável do Merchant App: uma aplicação para consultar avaliações objetivas de produtos e evitar compras ruins repetidas.

## Stack

- React
- TypeScript
- Vite
- Vitest
- API FastAPI hospedada no Render

## Executar localmente

```bash
cp .env.example .env.local
npm install
npm run dev
```

A aplicação usa `VITE_API_URL` para localizar a API. O valor de exemplo aponta para `https://fastapi-merchant-app.onrender.com`.

## Verificações

```bash
npm test
npm run typecheck
npm run build
```

O CI do GitHub executa testes, verificação de tipos e build em todo pull request.

## Rotas

- `/`: busca;
- `/products/:id`: detalhe e avaliações;
- `/products/new`: cadastro autenticado;
- `/account`: produtos e avaliações do usuário.

## Organização

A decisão arquitetural inicial e os módulos estão em [docs/architecture.md](docs/architecture.md).

## Backend

O backend está separado em [vsys-val/fastapi-merchant-app](https://github.com/vsys-val/fastapi-merchant-app).
