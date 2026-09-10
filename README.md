# Merchant App Web

Frontend web responsivo do Merchant App: uma aplicação para consultar avaliações objetivas de produtos e evitar compras ruins repetidas.

## Stack

- React
- TypeScript
- Vite
- API FastAPI hospedada no Render

## Executar localmente

```bash
cp .env.example .env.local
npm install
npm run dev
```

A aplicação usa `VITE_API_URL` para localizar a API. O valor de exemplo aponta para:

```text
https://fastapi-merchant-app.onrender.com
```

## Verificações

```bash
npm run typecheck
npm run build
```

## Organização

A decisão arquitetural inicial e os próximos módulos estão em [docs/architecture.md](docs/architecture.md).

## Backend

O backend está separado em [vsys-val/fastapi-merchant-app](https://github.com/vsys-val/fastapi-merchant-app).
