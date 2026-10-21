# Banco de dados e migrations

PostgreSQL no Neon, Drizzle ORM e migrations versionadas em `drizzle/`. Não usar `drizzle-kit push` para substituir o histórico. Aplicação: `DATABASE_URL` com conexão pooled. Migrations: `DATABASE_URL_UNPOOLED` com conexão direta. Todos os valores vêm do ambiente; `.env.example` contém apenas nomes e exemplos sem credenciais. Arquivos `.env.*` e `.dev.vars.*` ficam fora do Git.

## Estrutura

| Domínio | Tabelas | Integridade |
|---|---|---|
| Identidade | `user`, `account`, `session`, `verification`, `user_invitations` | FKs, identidade de provedor única, e-mail sem duplicidade por caixa, índices por usuário e expiração de convite |
| Permissões | `roles`, `permissions`, `role_permissions` | FKs, chave primária composta, catálogo inicial dos perfis aprovados |
| Território | `communities`, `territorial_boundaries` | Tipos, coordenadas, PostGIS, GiST e unicidade do nome normalizado por tipo |
| Pessoas | `contacts` | FKs de localidade/responsável, telefone normalizado único, base legal, limites de campos e versão positiva |
| Autorizações | `contact_authorizations` | Histórico por contato/versão, FKs, evidência de comunicação, proibição de alteração/exclusão/truncamento |
| Agenda | `visits` | FKs, status/tipo, intervalo válido, versão, índices de data/responsável/localidade e relato para visita concluída |
| Atividades e demandas | `activities`, `demands` | FKs, status, índices e validação espacial onde aplicável |
| Auditoria | `audit_logs` | FKs opcionais de autor e usuário relacionado, resultado permitido, metadata como objeto JSON e histórico imutável |

As FKs dos históricos usam `RESTRICT` para preservar referências. O fluxo de usuários desativa contas; não apaga usuários com histórico. Senhas individuais são armazenadas como hashes pelo Better Auth. Credenciais de infraestrutura e segredos de autenticação permanecem no ambiente e nos secrets do Worker.

## Permissões no servidor

A autorização consulta o perfil atual do usuário, `roles.enabled` e `role_permissions` a cada requisição protegida. A matriz aprovada em `src/lib/permissions.ts` funciona como limite adicional: uma concessão acidental no banco não amplia o acesso além do perfil previsto no código. A auditoria global também consulta sua permissão específica. Revogar uma permissão no banco bloqueia a próxima requisição, mesmo com sessão existente. O perfil futuro de saúde fica sem permissões e não pode ser ativado.

O catálogo inicial é configuração do sistema, não dados de demonstração. Alterações posteriores em perfis, permissões e vínculos geram auditoria. Não foi criada uma tela para editar essa matriz nesta etapa.

## Autorizações e migração de registros existentes

A tabela nova registra o estado da base legal, finalidade, evidências e canais de comunicação no mesmo commit do contato. Mudanças apenas em nome, telefone ou observações não duplicam o registro de autorizações. Concessões, revogações e mudanças de justificativa geram novas entradas com autor e versão. O estado atual continua nas colunas do contato para consulta eficiente.

O backfill preserva exatamente os dados já documentados e usa a origem `migracao`, com autor nulo. A data de registro da migração não representa uma nova manifestação de consentimento. Canais desmarcados permanecem desmarcados. Não se inventam base legal ou evidência ausentes. Alguns checks usam `NOT VALID` para preservar registros legados; novas escritas e atualizações são submetidas à validação. Dados legados pendentes precisam ser corrigidos antes de sua edição.

## Migrations desta etapa

- `0011_fast_the_watchers.sql`: catálogo de perfis/permissões, histórico de autorizações e FKs.
- `0012_integrity_and_authorizations.sql`: backfill, triggers, históricos imutáveis e checks adicionais.
- `0013_clammy_pixie.sql`: índices de identidade, sessões, verificação e unicidade territorial.
- `0014_spooky_shockwave.sql`: índices das FKs de perfil e localidades de agenda/demandas.

As migrations anteriores preservam o histórico dos cadastros, autenticação, PostGIS, contatos e agenda. Não foram reescritas migrations já publicadas.

## Isolamento do frontend e verificação

`src/db/client.ts` e `src/db/write.ts` usam `server-only`; conexões, SQL, permissões e auditoria são executados no servidor. Componentes cliente recebem somente dados autorizados, nunca URLs de conexão. Não criar `NEXT_PUBLIC_DATABASE_URL`, não serializar conexões em props/respostas e não colocar segredos em `next.config.ts`.

`tests/client-boundary.test.ts` percorre as importações dos componentes cliente. O CI executa `scripts/verify-client-bundle.mjs` após o build: verifica fronteiras de servidor, variáveis privadas, conexões PostgreSQL e valores reais de segredos quando disponíveis, sem exibir seus conteúdos. Os scripts de teste de banco usam somente arquivos de ambiente locais ignorados pelo Git.

Validação realizada em uma branch Neon schema-only isolada: instalação completa em banco vazio e segunda execução sem reaplicações; atualização com registros sintéticos existentes; rejeição de FKs inválidas, duplicidades, intervalos e autorizações sem evidência; imutabilidade dos históricos; revogação de permissões com sessões reais; proteção adicional contra ampliação acidental de privilégios. Nenhum registro de teste é inserido em produção.
