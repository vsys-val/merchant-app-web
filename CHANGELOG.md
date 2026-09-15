# Changelog

Este projeto segue [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-09-15

### Adicionado

- Redesign editorial completo e responsivo.
- Fluxos de conta, busca, produtos, avaliações e área pessoal.
- Rotas compartilháveis e experiência PWA.
- Testes unitários, de componentes e ponta a ponta.
- Documentação de arquitetura, contribuição e segurança.

### Alterado

- Modais agora contêm o foco, fecham com `Escape` e restauram o foco.
- Erros de exclusão são apresentados dentro da confirmação.
- Cache do PWA usa rede primeiro para navegações.
- Cliente HTTP interrompe solicitações demoradas.
- Instalações de CI e Render usam `npm ci`.

### Segurança

- Dependências atualizadas sem vulnerabilidades conhecidas no `npm audit`.
- Cabeçalhos de segurança definidos no deploy estático.

[0.3.0]: https://github.com/vsys-val/merchant-app-web/releases/tag/v0.3.0
