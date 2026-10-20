# CONECTA 2028 — Verificação da stack

Data: 20/10/2026. Escopo: conferir a stack solicitada antes de substituir o protótipo local.

## Atualização: implementação do dashboard

A etapa seguinte migrou o dashboard para Next.js e conectou a branch Neon `development` do projeto `conecta2028`. Typecheck, testes, build de produção Next.js e verificação de leitura no banco passaram. PostGIS 3.5.7 foi consultado e habilitado por migração; as tabelas de negócio estão vazias, sem seed. A API exige sessão e retornou 401 no teste sem login.

O build OpenNext foi tentado, mas parou em `EPERM` na criação de symlink no Windows. Não houve deploy Cloudflare. O workflow em `.github/workflows/check.yml` prepara a verificação em Linux; não foi executado remotamente, pois ainda não há repositório GitHub conectado. As seções abaixo preservam o relatório original de seleção de versões; a execução descrita nesta atualização é a evidência mais recente.

## Resultado

A stack é viável para Cloudflare Workers, com condições de integração. A documentação e os requisitos de versões foram conferidos. A resolução estrita de peer dependencies passou em um manifesto isolado. Isso ainda não certifica execução em Workers: não foi feito build do aplicativo Next.js, teste em workerd ou deploy, e não há banco Neon conectado para testar autenticação ou PostGIS nesta instância.

O projeto principal continua sendo o protótipo HTML/CSS/JavaScript, com a identidade aprovada e a logo transparente. Nenhuma dessas tecnologias foi declarada como implementada no aplicativo.

## Matriz de compatibilidade

| Tecnologia | Versão candidata | Resultado e condição |
| --- | --- | --- |
| Next.js com App Router | 16.4.2 | Suporte documentado pelo OpenNext. Usar runtime Node.js do Next dentro de Workers, sem `runtime = 'edge'`. |
| React / React DOM | 19.3.1 | Aceitos pelos peers do Next, Better Auth e Lucide selecionados. |
| TypeScript | 5.9.3 | Executado no desenvolvimento/build; não no Worker. Escolhido como baseline conservadora, em vez de migrar simultaneamente para a major 7 recém-disponível. Compilação ainda pendente. |
| Tailwind CSS / PostCSS | 4.3.3 | Compilação de CSS no build. Nenhum processo PostCSS no runtime Workers. |
| shadcn/ui | CLI 4.22.1 | Gera componentes locais React; a CLI não vai para o Worker. Os componentes escolhidos e suas dependências Radix precisam integrar o teste do aplicativo. |
| Lucide React | 1.60.0 | Componentes SVG React. Importar ícones nomeados, sem catálogo dinâmico completo. |
| Neon PostgreSQL | Serviço externo | A conexão pelo driver serverless não depende de um servidor PostgreSQL instalado no Cloudflare. Projeto/branch ainda não vinculados. |
| Driver Neon | 1.2.0 | HTTP para consultas independentes; WebSocket para transações interativas. Não confundir essas duas capacidades. |
| Drizzle ORM / Kit | 0.45.4 / 0.31.11 | Peers aceitos. ORM no servidor; Kit/migrações no ambiente de desenvolvimento ou CI, nunca no startup do Worker. |
| Better Auth + adaptador Drizzle | 1.7.12 / 1.7.12 | Integração oficial Next.js/Drizzle. Suporte operacional depende de teste de sessões, cookies, banco e hashing no runtime Workers. |
| MapLibre GL JS | 6.15.0 | Executar apenas no navegador; v6 exige WebGL2 e configuração do Web Worker no bundler. Não importar como código de servidor. |
| PostGIS | Determinada pelo banco | Disponível no Neon conforme documentação; disponibilidade/versão/habilitação no projeto ainda precisam de consulta SQL. |
| OpenNext Cloudflare | 1.20.12 | Peers exigem Next `>=15.5.28 <16` ou `>=16.4.1`, Wrangler `^4.148.0`. Os candidatos respeitam essas faixas. |
| Wrangler | 4.151.3 | Exige Node >=22 no ambiente de ferramentas. O Node local 24.19.0 atende. |
| GitHub | Serviço externo | Integração oficial com Workers Builds; também é possível usar GitHub Actions em Linux. Nenhum repositório remoto foi criado ou conectado. |

Versões obtidas diretamente do registro npm durante a verificação. O manifesto e o lockfile em `docs/stack-validation/` são uma prova isolada de resolução, não o package.json de produção.

## Caminho para Cloudflare

A documentação atual da Cloudflare recomenda **vinext** como caminho padrão para aplicações Next.js. OpenNext continua documentado como caminho alternativo e mantém suporte ao Next.js oficial. Como o requisito pede Next.js com App Router, a proposta verificada aqui preserva o compilador e build oficiais do Next.js usando OpenNext. Não houve substituição silenciosa por vinext. Caso se escolha vinext posteriormente, seu build e compatibilidade devem passar por outra verificação; o lockfile atual não o inclui.

Para a proposta OpenNext: Worker com compatibilidade Node, entrada `.open-next/worker.js` e assets `.open-next/assets`. Fixar a compatibility date na implementação e conferir os comportamentos associados. Com datas a partir de 2026-08-04, a documentação da Cloudflare informa compatibilidade Node habilitada por padrão; a configuração explícita deve ser validada pelo Wrangler selecionado. Não usar exportação estática/Cloudflare Pages para substituir os handlers de autenticação e banco.

Desenvolvimento Next.js pode ocorrer no Windows. OpenNext não garante suporte Windows completo; a validação de produção deve rodar em Linux, por exemplo GitHub Actions ou WSL. Medir tamanho comprimido do Worker e CPU no plano escolhido, sem assumir que o plano gratuito acomoda o conjunto.

Fontes: [Cloudflare Next.js](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [OpenNext: suporte e Windows](https://opennext.js.org/cloudflare), [setup OpenNext](https://opennext.js.org/cloudflare/get-started), [compatibilidade Node](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

## Banco e autenticação

Arquitetura proposta: componentes de servidor e Route Handlers → autorização → Drizzle → Neon. Credenciais ficam no servidor. Usar conexão pooled no tráfego da aplicação e conexão direta nas migrações; testar migrações em branch de desenvolvimento antes de produção.

Para consultas simples, Drizzle `neon-http` é adequado. Para operações de autenticação que necessitem atomicidade, usar `neon-serverless` por WebSocket com ciclo de vida por requisição e adaptador Drizzle configurado com `transaction: true`. Não ativar transações interativas sobre o driver HTTP. Testar a abertura/encerramento da conexão em workerd.

Better Auth possui integração oficial com Next.js e adaptador PostgreSQL Drizzle. Para a versão verificada, conferir o pacote separado `@better-auth/drizzle-adapter`. A configuração deve fornecer origem confiável, URL da aplicação, secret e cookies apropriados. A escolha entre Better Auth gerenciado pelo Neon e hospedado no Worker ainda precisa ficar explícita antes da implementação: esta matriz avalia os pacotes da alternativa hospedada no aplicativo, sem provisioná-la.

O hashing padrão usa scrypt. É necessário medir cadastro/login no runtime Workers e no limite de CPU do plano. Não adicionar bindings binários nativos de Argon2/bcrypt nem reduzir os parâmetros de segurança para fazer o teste passar.

Fontes: [Drizzle e Neon](https://orm.drizzle.team/docs/connect-neon), [Better Auth com Next.js](https://better-auth.com/docs/integrations/next), [adaptador Drizzle](https://better-auth.com/docs/adapters/drizzle), [senhas e transações](https://better-auth.com/docs/authentication/email-password), [Web Crypto em Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/).

## MapLibre e PostGIS

MapLibre renderiza no cliente e não depende de PostGIS para exibir o mapa. PostGIS fica no Neon para consultas espaciais. O servidor deve retornar GeoJSON filtrado/autorizado, nunca uma conexão de banco ao navegador. O fornecedor de tiles/estilo, sua atribuição e eventuais credenciais são uma escolha separada: a biblioteca não fornece automaticamente uma base satélite. A imagem de mapa atual permanece ilustrativa até essa integração.

Para MapLibre v6, usar componente cliente carregado sob demanda, WebGL2, CSS da biblioteca e URL de worker conforme o bundler. Dispositivos sem WebGL2 precisam de fallback visível.

O arquivo `stack-validation/check-postgis.sql` consulta `pg_available_extensions` sem alterar o banco. Depois de confirmar disponibilidade e selecionar a branch, habilitar PostGIS em uma migração separada e validar `PostGIS_Full_Version()`. A versão da extensão é definida pela instância Neon, não pelo npm. Não executar migração de geometria ou criar índice GiST antes da extensão estar instalada.

Fontes: [MapLibre: instalação](https://maplibre.org/maplibre-gl-js/docs/), [MapLibre v6/WebGL2](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [PostGIS no Neon](https://neon.com/docs/extensions/postgis).

## Frontend e GitHub

Preservar a identidade aprovada na migração para componentes React. Tailwind entra como compilação CSS e shadcn como componentes locais, sem exigir um servidor Node permanente. Manter ícones SVG através de imports nomeados Lucide.

Versionar código, migrações, manifesto e lockfile. Segredos ficam em variáveis protegidas do ambiente/Cloudflare, nunca no repositório. O `.gitignore` já exclui `.env`, `.dev.vars` e diretórios de build. Ao conectar o GitHub, executar CI Linux com instalação congelada, typecheck, testes pertinentes, build Next, build OpenNext e testes HTTP no runtime Workers. Só depois conectar o deploy ao ambiente de produção.

Fontes: [Tailwind com Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [shadcn com Next.js](https://ui.shadcn.com/docs/installation/next), [Lucide React](https://lucide.dev/guide/react), [integração Git no Cloudflare](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/).

## Evidências e pendências

- Executado: consulta de versões/engines/peers no npm; resolução de 726 pacotes com `pnpm install --lockfile-only --strict-peer-dependencies`, saída 0, sem instalação de node_modules. Quatro dependências transitivas obsoletas foram informadas; não são prova de incompatibilidade, mas exigem acompanhamento na instalação efetiva.
- Gerado: manifesto candidato e lockfile isolados. O pnpm local é 11.25.0; não foi atualizado.
- Ainda não executado: compilação TypeScript/Next/OpenNext, bundle em workerd, teste de CPU/tamanho do Worker, teste WebGL2/tiles e autenticação ponta a ponta.
- Ainda sem acesso configurado: branch Neon, secrets Cloudflare e repositório GitHub escolhido. Nenhuma variável de ambiente com nomes relacionados a esses serviços foi encontrada nesta sessão; valores não foram lidos ou impressos.
- Conclusão: compatibilidade documental e resolução de dependências verificadas; homologação de runtime e infraestrutura permanece pendente. Isso não é uma certificação de deploy nem uma migração concluída.
