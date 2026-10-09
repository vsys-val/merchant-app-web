# Verificação operacional antes do piloto

Este procedimento verifica o ambiente publicado sem cadastrar usuários, avaliações ou produtos. Alterar o repositório não demonstra que cabeçalhos do Render foram aplicados. Nenhum deploy é executado por este documento.

1. Comparar o commit publicado (`/build-info.json`, conforme `scripts/wait-for-deploy.mjs`) ao commit aprovado. Aguardar o deploy exato antes do smoke.
2. Conferir no painel do serviço estático Render as regras de rewrite `/api/*`, `/health` antes de `/*` e a CSP efetivamente enviada no documento HTML. `img-src` deve permitir `https://images.openfoodfacts.org`, `https://images.openbeautyfacts.org` e `https://images.openproductsfacts.org`. Preservar as demais diretivas do `render.yaml`; não usar curingas para resolver bloqueios.
3. Executar `PLAYWRIGHT_BASE_URL=https://merchant-app-web.onrender.com npm run test:e2e:production`. O teste público tem orçamento de 360 s, com no máximo quatro tentativas de 35 s para acordar a API. Falhas de cabeçalho são falhas de publicação, mesmo se o build estiver verde.
4. Verificar foto carregada (`naturalWidth > 0`), fallback quando o provedor falha e atribuição nos detalhes. Os testes locais mockam imagens para repetibilidade; o smoke público consulta o catálogo real e depende da disponibilidade do provedor. A política dos três provedores é verificada, mas a carga real de cada provedor exige produto correspondente disponível no catálogo.
5. Em perfil de navegador que já usava a versão anterior, recarregar e confirmar que o worker v4 assumiu o controle; caches `merchant-shell-v2`/`v3` devem desaparecer. Buscar duas vezes, entrar/sair em uma conta de teste autorizada e verificar que `/api/*` não existe no Cache Storage. Testes unitários cobrem a ativação, não substituem esta verificação de atualização num navegador instalado.
6. Conferir respostas autenticadas e erros de sessão com `Cache-Control: no-store` na API. O cliente também solicita `cache: no-store`; isso não substitui os cabeçalhos do servidor.

## Critério de liberação

Registrar SHA, data, URL, resultado do smoke e pendências. Não marcar pronto com fotos bloqueadas, respostas privadas cacheadas ou logout sem confirmação. Os metadados de origem/licença dependem da migração da API; licença desconhecida permanece explicitamente não informada. Revisar os créditos pendentes antes de explorar comercialmente essas imagens.
