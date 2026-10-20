# CONECTA 2028

## Cadastro territorial

O menu **Mapa de Xexéu** abre `/territorio`: cadastro e edição dos cinco tipos de localidade, mapa MapLibre com referência oficial IBGE, importação de limites GeoJSON/IBGE e localização de atividades existentes. A documentação está em `docs/CADASTRO-TERRITORIAL.md`. As migrações geográficas foram aplicadas na branch `development`, sem inserir cadastros fictícios.

## Gestão de usuários (versão atual)

Perfis e permissões no servidor, ativação individual, revogação de sessões e auditoria foram adicionados. Veja `docs/GESTAO-USUARIOS.md` para a matriz e os fluxos. A prévia sem login foi removida: o dashboard agora exige autenticação em todos os ambientes.

Para criar a primeira conta com a sua própria senha, abra http://localhost:3000/configuracao-inicial no ambiente local. Essa tela fecha após o primeiro cadastro e não funciona em produção. Não há credenciais padrão.

## Dashboard conectado ao Neon (versão atual)

O aplicativo agora usa Next.js App Router, TypeScript, Tailwind, componentes shadcn/ui, Lucide React, Drizzle e Neon. A composição visual e a marca transparente foram preservadas. A implementação atual fica em `src/`; os arquivos HTML/JS na raiz são o protótipo anterior e não são servidos pelo Next.js.

```sh
pnpm dev
```

Abra http://localhost:3000. O banco é consultado no servidor. Não há seed, fallback demonstrativo ou uso do localStorage para preencher indicadores. Banco vazio retorna quatro contagens zero e listas vazias; falhas de conexão e ausência de sessão são estados separados, com contagens indisponíveis (`—`).

Projeto Neon: `conecta2028` (`royal-surf-64349853`), região `aws-us-east-1`, PostgreSQL 17. Desenvolvimento em `development` (`br-calm-wave-b8q6tkbw`). A branch `main` permanece sem as migrações de desenvolvimento. PostGIS 3.5.7 foi verificado e habilitado por migração na branch de desenvolvimento. As tabelas de negócio permanecem vazias.

As credenciais locais ficam em `.env.local`, excluído do Git. A prévia local está configurada com `DASHBOARD_LOCAL_PREVIEW=true`: permite visualizar somente a página do dashboard com dados da branch de desenvolvimento quando `NODE_ENV=development`. O servidor dev está restrito a `127.0.0.1`. Essa opção é ignorada em produção. A API `/api/dashboard` sempre exige sessão Better Auth, mesmo em desenvolvimento. Não crie um usuário ou senha de demonstração para preencher o cabeçalho.

Autenticação: infraestrutura Better Auth preparada; cadastro público desabilitado. Não há conta de equipe criada ainda. Provisionamento das contas e configuração de login operacional são uma etapa separada. O adaptador HTTP não habilita transações interativas; fluxos futuros que exijam atomicidade devem migrar para conexão WebSocket por requisição conforme o relatório de compatibilidade.

Regras dos indicadores:

- Contatos e comunidades: todos os registros cadastrados nas respectivas tabelas.
- Visitas agendadas: status `agendada` com data/hora a partir de agora.
- Demandas em andamento: status `em_andamento`.
- Atividades por localidade: quantidade de registros de `activities`, agrupados por comunidade, incluindo `Sem localidade` quando não vinculados.
- Agenda: visitas não canceladas, com status `agendada`, entre o início de hoje e o início de amanhã em `America/Fortaleza`.
- Demandas por categoria: todas as demandas agrupadas por categoria.
- Últimas atividades: até dez registros, em ordem decrescente de ocorrência.

As seções são produzidas por um único SELECT no PostgreSQL, garantindo um mesmo snapshot. Datas vêm do servidor e são exibidas no fuso de Fortaleza.

Mapa: MapLibre é carregado apenas se existirem comunidades com coordenadas. Nenhum ponto, limite territorial ou mapa estatístico fictício é exibido. Configure `NEXT_PUBLIC_MAP_STYLE_URL` com um provedor de estilo/tiles para ter base cartográfica; sem ela, apenas as posições reais podem ser exibidas, com aviso. A imagem do dashboard aprovado permanece usada somente na arte decorativa do banner, nunca como dado territorial.

Comandos atuais:

```sh
pnpm check
pnpm test
pnpm build
pnpm cf:build
pnpm cf:preview
pnpm db:generate
pnpm db:migrate
node --import tsx scripts/verify-database.ts
```

`scripts/verify-database.ts` é uma verificação **somente de leitura** para o estágio inicial: exige contagens e listas vazias. Após inserir os primeiros registros reais, essa expectativa inicial deixa de ser aplicável. Migrações usam `DATABASE_URL_UNPOOLED` e não são executadas no startup do servidor. Não houve deploy nem criação de repositório GitHub nesta etapa.

## Histórico do protótipo anterior

Primeira versão navegável da plataforma de gestão de atividades comunitárias, com interface em português e identidade em vermelho, laranja, amarelo e creme.

## Executar

Requer Node.js 20 ou superior, sem instalação de dependências.

```sh
node server.mjs
```

Abra http://localhost:3000. Verificação de sintaxe: `node --check app.js` e `node --check server.mjs`.

## Funcionalidades

- Painel com indicadores calculados a partir dos registros.
- Cadastro, edição, conclusão e exclusão confirmada de atividades.
- Busca por atividades e pessoas, filtros de status e exportação CSV.
- Agenda mensal com navegação e detalhes dos eventos.
- Cadastro de integrantes e agrupamento por comunidade.
- Relatórios por categoria e percentual de conclusão.
- Menu recolhível, navegação responsiva e diálogos acessíveis por teclado.
- Persistência local versionada em `localStorage`, com dados iniciais demonstrativos.

## Arquitetura e limites

Frontend sem dependências, servido por um servidor HTTP Node.js. `app.js` contém modelo de dados, visualizações e ações; `styles.css` concentra os tokens visuais e regras responsivas. As entradas são escapadas antes da renderização e a exportação trata prefixos de fórmulas.

Esta versão é um protótipo funcional local. O perfil Ana Silva é demonstrativo: não há autenticação, autorização, backend de dados, notificações remotas ou compartilhamento entre usuários. Dados reais de equipe exigem essas integrações antes do uso operacional. Nenhuma mensagem de convite é enviada ao cadastrar pessoas.

## Identidade visual

A imagem original fornecida está em `public/branding/logo-minguinho.png`, preservada sem edição. O CSS ajusta apenas o enquadramento das margens brancas. `docs/references/dashboard-aprovado.png` ainda precisa ser fornecida para comparar e validar a fidelidade ao dashboard aprovado.
