# Changelog

Este projeto segue [Semantic Versioning](https://semver.org/).

## [Não lançado]

### Adicionado

- Busca combinando nome, marca e categoria, com chips de categoria e modo separado para código de barras.
- Filtros da busca na URL: a busca é restaurada ao voltar de um produto, ao recarregar e ao abrir um link.
- Confirmação de conta com código de 6 dígitos enviado por e-mail, com reenvio limitado a um por minuto.
- Recuperação de senha por código ("Esqueci minha senha").
- Atalho "Ver produto já cadastrado" quando o cadastro de produto é duplicado.
- Correção de produto pelo responsável a partir de "Meus produtos", com aviso antecipado quando outra pessoa já avaliou o item.
- Painel administrativo em `/admin`: saúde e versões no ar, métricas de produto com meta, crescimento, catálogo, operação da API e erros do navegador, com tabela equivalente para cada gráfico e modo escuro.
- Eventos de uso próprios (busca, detalhe, etapas da avaliação, cadastro de produto, criação de conta, carregamento e erros), sem dados pessoais e desligados com *Do Not Track*, em navegadores automatizados e fora do build de produção.
- O commit do build é embutido no bundle e aparece no painel.
- "O que a comunidade destaca" no detalhe do produto: os aspectos mais elogiados e mais criticados, com a contagem de avaliações.
- Motivos de cada avaliação (ex.: "+ Sabor", "− Preço") visíveis na lista da comunidade e em "Sua experiência".
- Busca tolerante a erros de digitação: sem resultado exato, a lista mostra os produtos parecidos com o aviso "Nada exato para …" e o convite para cadastrar.
- Painel: parcela de buscas respondidas só com produtos parecidos.
- Leitura de código de barras pela câmera na busca e no cadastro de produto (EAN-13, EAN-8 e UPC-A), com leitor nativo quando existe e ZXing carregado sob demanda.
- Painel: aberturas do leitor, leituras concluídas e parcela sem câmera disponível.

### Alterado

- `Permissions-Policy` libera a câmera para a própria origem (`camera=(self)`).
- Os rótulos dos aspectos ficam em um único módulo, usado pelo formulário de avaliação, pelo detalhe e pelo painel.
- O cliente HTTP aceita respostas `202 Accepted` sem corpo.

### Corrigido

- Em telas estreitas, o campo de busca e o botão voltam a ficar na mesma linha.
- "(opcional)" deixa de quebrar linha nos rótulos de variante e código GTIN.

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
