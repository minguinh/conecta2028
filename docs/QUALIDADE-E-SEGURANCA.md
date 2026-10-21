# Qualidade e segurança

## Verificações

`pnpm test` executa testes Node/tsx sem credenciais: datas e intervalos, escopos, permissões, contatos, GeoJSON, SQL parametrizado, transporte do navegador, JSON por streaming, origem, erros sem segredos e fronteira cliente/servidor. O contrato de rotas detecta APIs novas sem autorização explícita e mutações sem validação de origem.

`pnpm check` valida TypeScript. `pnpm build` verifica compilação. `node scripts/verify-client-bundle.mjs` verifica imports e arquivos estáticos contra credenciais privadas e padrões de conexão. O CI executa esses passos antes de empacotar OpenNext.

## Integração isolada

Nunca execute fixtures em produção. Crie branch Neon descartável sem dados pessoais. Schema-only copia estruturas, não linhas: semear roles, permissions e role_permissions conforme `src/lib/permissions.ts` é obrigatório. Alternativamente crie banco vazio nessa branch e aplique todas as migrations, que incluem o catálogo.

Configure `.env.security` privado com DATABASE_URL, DATABASE_URL_UNPOOLED e SECURITY_TEST_BRANCH=true apontando exclusivamente para esse ambiente. Inicie `node scripts/start-security-server.mjs` na porta 3002. Execute `node --import tsx scripts/verify-security-http.mjs` em banco sem usuários: cria quatro identidades fictícias e testa todas as operações protegidas, anônimos, perfis, origem, limite, JSON, cadastro público, revogação de concessão, perfil desabilitado e teto estático. O script altera concessões apenas nessa branch e não deve compartilhar fixtures com outros conjuntos.

Os scripts verify-agenda-http, verify-contacts-http, verify-territory-http, verify-users-http, verify-auth-sessions e verify-integrity têm pré-condições próprias; use bancos novos e respeite seus asserts. Testes de upgrade exigem versão inicial específica. Ao terminar, encerre servidor, exclua branch e remova .env.security. Não rode servidores Next simultâneos escrevendo arquivos gerados.

## Acessibilidade

Revisar teclado: Tab até “Pular para o conteúdo”, foco no conteúdo, navegação, menu mobile, formulários, filtros, paginação e recuperação de erros. Conferir leitor de tela, zoom 200%, largura 360 px, mensagens assíncronas e movimento reduzido. Listagem e coordenadas oferecem alternativa ao mapa. Validar contraste ao mudar cores; preservar rótulos e foco visível.

Testes automatizados não equivalem a certificação WCAG nem cobrem todas as combinações de leitor de tela e dispositivo. Revisão manual continua necessária em novos fluxos.

## Publicação e incidentes

Entregar após CI e implantação confirmados. Comparar BUILD_ID remoto com artefato e conferir login e APIs sem sessão. Nunca incluir credenciais no Git ou NEXT_PUBLIC_. Manter secrets estáveis e rotacionar em caso de exposição. Não registrar senha, token de ativação ou URL do banco. Use requestId para correlação de falhas inesperadas; o tratamento genérico registra somente esse identificador.
