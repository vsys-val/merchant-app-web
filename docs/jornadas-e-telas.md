# Jornadas e telas

Este documento liga cada tela da interface às necessidades que ela atende. A documentação de produto e de requisitos fica no repositório da API:

- [Visão de produto](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/visao-produto.md): problema, personas, métricas
- [Histórias de usuário](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/historias-usuario.md) (US01–US13) com critérios de aceite
- [Matriz de rastreabilidade](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/rastreabilidade.md): requisito → endpoint → teste → tela
- [Decisões (ADRs)](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/README.md)

## Dois contextos, duas posturas de interface

A [ideação](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/ideacao.md) identificou dois momentos de uso com necessidades opostas. A interface foi desenhada para cada um:

| | **No corredor** (decidir) | **Em casa** (registrar) |
|---|---|---|
| Situação | Pressa, uma mão, celular | Calma, depois de usar o produto |
| Objetivo | Chegar à resposta em poucos toques | Registrar com cuidado, sem erro |
| Decisões de interface | Leitura sem login · busca em destaque na home · código de barras com teclado numérico · intenção de recompra já no card do resultado | Formulário em 3 etapas · validação por etapa · conferência antes de publicar · confirmação para excluir |

## Mapa de navegação

```mermaid
flowchart LR
  H["/ Início<br/>lembretes"] --> S["/search<br/>busca"]
  S --> P["/products/:id<br/>detalhe"]
  S --> N["/products/new<br/>cadastro 🔒"]
  N --> P
  P --> R["Avaliação<br/>3 etapas 🔒"]
  R --> P
  H --> A["/account<br/>minha área 🔒"]
  A --> P
  H -. sem sessão .-> L["Modal de acesso<br/>entrar · cadastrar"]
  N -. sem sessão .-> L
  A -. sem sessão .-> L
  A -. administração .-> ADM["/admin<br/>painel 🛡️"]
```

🔒 exige sessão. Sem sessão, a rota mostra um convite para entrar em vez dos dados. 🛡️ exige uma conta de administração; o atalho aparece em Minha área só para ela.

## Telas

| Tela | Rota / componente | Histórias | Requisitos | Estados tratados | Testes |
|---|---|---|---|---|---|
| Início | `/` · `HomeView` em `App.tsx` | US12 | RF14, RF15 | visitante · carregando · sem avaliações · com lembretes · erro · API offline | e2e `merchant.spec.ts`, `production.spec.ts` |
| Modal de acesso | `AuthPanel` | US01, US02, US14, US15 | RF01, RF02, RF16–RF18 | login · cadastro · confirmação por código · reenvio com contagem de 60 s · esqueci a senha · nova senha · e-mail indisponível · erro da API | `AuthPanel.test.tsx`; e2e (teclado, foco, Esc, cadastro com código) |
| Busca | `/search` · `ProductSearch` | US03, US04 | RF03, RF04 | sem busca · buscando · vazio (com os filtros aplicados) · resultados paginados · termo curto · código inválido · erro · restaurada da URL | `ProductSearch.test.tsx`; e2e (filtros combinados e volta do produto) |
| Detalhe | `/products/:id` · `ProductDetailView` | US04, US05, US11 | RF05, RF11, RF12 | carregando · não encontrado · com/sem avaliação própria · comunidade vazia · paginação | `ProductDetailView.test.tsx`, e2e |
| Avaliação | `ReviewForm` | US09, US10 | RF08, RF09 | etapa 1 · etapa 2 · conferência · validação por etapa · erro ao salvar | cobertos pela API (T18–T21) |
| Cadastro de produto | `/products/new` · `ProductForm` | US06 | RF06 | formulário · salvando · duplicata com atalho para o produto existente · erro de validação | `ProductForm.test.tsx`; API (T08–T11) |
| Correção de produto | `/products/:id/edit` · `ProductEditView` + `ProductForm` | US07 | RF07 | carregando · bloqueado (avaliado por outra pessoa) · formulário preenchido · nada alterado · duplicata · bloqueio durante a edição · erro | `ProductEditView.test.tsx`; e2e (Meus produtos → corrigir → salvar) |
| Minha área | `/account` · `AccountDashboard` | US13 | RF14 | carregando · vazio · lista · paginação · erro | cobertos pela API (T28) |
| Painel administrativo | `/admin` · `AdminDashboard` | US16 | RF19, RF20 | sem sessão · sem permissão (sem chamar a API) · carregando · erro com tentar de novo · sem dados no período · 7/30/90 dias · claro/escuro | `AdminDashboard.test.tsx`, `analytics.test.ts`; e2e `admin.spec.ts` (desktop e mobile) |

## Decisões de UX e sua origem

| Decisão | Motivo | Origem |
|---|---|---|
| Avaliação em **3 etapas** (experiência → motivos → conferência) | A ideação atribuiu à interface a tela de confirmação. Dividir reduz a carga no celular e valida cedo | Ideação, "Responsabilidades da API e da interface" · [ADR-0001](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0001-avaliacao-estruturada-sem-nota.md) |
| Rótulos semânticos ("Compraria novamente", "Justo") em vez de números | Os valores da API são controlados; a interface os traduz sem inventar escala | [ADR-0001](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0001-avaliacao-estruturada-sem-nota.md) |
| "Sua experiência" antes de "Avaliações da comunidade" | A opinião própria é o sinal mais forte para a recompra | [ADR-0006](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0006-avaliacao-pessoal-separada.md) |
| Card da busca mostra **a sua** intenção ou, sem ela, a intenção predominante da comunidade | Responde "compro de novo?" sem abrir o produto | [ADR-0002](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0002-intencao-de-recompra-como-resumo.md) |
| Aviso "Sua avaliação será pública com seu nome de exibição" na conferência | Consentimento informado sobre a autoria pública | [ADR-0009](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0009-leitura-publica-escrita-autenticada.md) |
| Nome, marca e categoria **combinados**; código de barras em modo separado | Espelha a regra da API (E entre filtros; GTIN exclusivo) e evita combinações que retornariam erro | RF04, RN14 |
| Chips de categoria que buscam ao toque, incluindo "Todas" | Navegar por categoria sem digitar é o caminho mais curto no corredor; permite explorar o catálogo | RF04 |
| Filtros na URL (`/search?name=…&category=…`) | A busca sobrevive à ida ao produto e à volta, ao recarregar e ao compartilhar o link | Rotas compartilháveis |
| Correção aberta a partir de **Meus produtos** | É o único lugar em que a interface sabe que o produto é da pessoa; o detalhe público não expõe o responsável | RF07, RNF02 |
| Bloqueio avisado **antes** do formulário | Para quem está logado, o resumo comunitário já exclui a própria avaliação: qualquer avaliação contada é de outra pessoa. Evita preencher algo que a API recusaria | RN13, [ADR-0005](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0005-bloqueio-de-edicao-apos-avaliacao.md) |
| Só os campos alterados vão no PATCH; quantidade e unidade sempre juntas | Respeita o contrato parcial e deixa a API normalizar a medida | Contrato: Editar produto |
| Confirmação de conta **por código dentro do próprio modal**, e confirmar já autentica | Não obriga a trocar de aplicativo nem abrir link no PWA; digitar 6 dígitos no celular é rápido; o teclado numérico e o preenchimento automático (`one-time-code`) reduzem erros | [ADR-0011](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0011-confirmacao-de-conta-por-codigo.md) |
| Mensagens de reenvio e de recuperação no condicional ("se existir uma conta...") | A API não revela quais e-mails estão cadastrados, e a interface também não | RN31 |
| Confirmação modal para excluir avaliação, com foco no "Cancelar" | Ação irreversível: o padrão seguro é não excluir | RN28 (sem histórico) |
| Cor **e** ícone **e** texto no status de recompra | Não depender só de cor (acessibilidade) | `design-qa.md` |
| Navegação inferior com 3 destinos | Alcance do polegar no celular; arquitetura de informação validada no protótipo | [Protótipo mobile](mobile-prototype.md) |
| Painel com **meta e estado** ao lado de cada métrica (ícone + texto, nunca só cor) | Um número sem referência não diz se está bom; as metas vêm da visão de produto | [ADR-0012](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/decisoes/0012-painel-e-instrumentacao-propria.md) |
| Cada gráfico tem uma **tabela equivalente** e tooltip por teclado | Leitores de tela e quem precisa do número exato; o gráfico sozinho não basta | Acessibilidade |
| Painel em largura total, fora da navegação do app | É uma ferramenta de trabalho no desktop, não um fluxo de compra; no celular vira uma coluna | US16 |
| Eventos só com escalares e sem texto digitado | Métricas sem coletar dados pessoais | RN36, RNF08 |
| Leitor de código pela câmera **ausente** | Fora do escopo desta versão; a CSP também bloqueia a câmera | [Roadmap](https://github.com/vsys-val/fastapi-merchant-app/blob/main/docs/roadmap.md) |

## Lacunas conhecidas

A API oferece mais do que a interface usa hoje. As lacunas são deliberadas e estão priorizadas no roadmap:

| Capacidade da API | Situação na interface | Roadmap |
|---|---|---|
| Excluir produto (RF13) | Sem tela | Próximo |

## Critérios de qualidade de interface

- Funciona de 320 px a desktop sem rolagem horizontal ([design-qa.md](../design-qa.md)).
- Operável por teclado: modais com foco contido, `Esc` e retorno do foco; abas com setas.
- Toda tela assíncrona trata carregando, vazio, sucesso e erro.
- Mensagens de erro vêm da API em português e aparecem próximas à ação que falhou.
