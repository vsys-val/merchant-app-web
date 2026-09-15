# Contribuindo

## Fluxo de desenvolvimento

1. Crie uma branch curta a partir da `main`.
2. Faça mudanças focadas e inclua testes para o comportamento alterado.
3. Execute as verificações locais.
4. Abra um pull request descrevendo resultado, riscos e evidências.
5. Aguarde o CI antes do merge.

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Use commits objetivos, por exemplo `fix: restaurar foco após fechar modal`. Não envie credenciais, tokens, `.env.local`, dados pessoais ou registros de produção.

## Critérios para mudanças de interface

- Preserve os quatro estados: carregando, sucesso, vazio e erro.
- Valide celular e desktop.
- Use elementos semânticos e mantenha navegação completa por teclado.
- Não dependa apenas de cor para comunicar resultado.
- Prefira rótulos em português aos valores técnicos da API.

## Pull requests

Inclua no texto da PR:

- problema e resultado esperado;
- telas ou módulos afetados;
- como a mudança foi testada;
- limitações ou decisões relevantes.
