# Arquitetura

Navegador → Next.js App Router no Cloudflare Worker (OpenNext/nodejs_compat) → serviços do servidor → Drizzle → Neon PostgreSQL com PostGIS.

## Camadas

- `src/app`: páginas, limites de erro/carregamento e Route Handlers.
- `src/components`: interface e componentes reutilizáveis; mapa carregado dinamicamente.
- `src/lib/*-types.ts`: contratos e validação pura.
- `src/lib/api-client.ts`: transporte compartilhado do navegador, tratamento de sessão expirada, rede e respostas não JSON.
- `src/lib/http.ts`: respostas privadas, origem, leitura de JSON com limites e erros seguros.
- `src/db`: schema, leituras Neon HTTP e transações Pool WebSocket encerradas por requisição.
- `drizzle/`: migrations e snapshots versionados.

O contexto transacional `app.actor_id` associa alterações à auditoria. Não manter conexões de sessão entre requisições do Worker. Secrets são lidos somente no servidor.

Resultados eleitorais usam três tabelas próprias, sem vínculos com contatos ou saúde. Consulta agregada exige `reports.read`; importação exige administrador e `users.manage`, revalidados na transação. Lotes têm SHA-256, origem, upsert por chave eleitoral e auditoria atômica. Veja [layout, limites e modelo geográfico](RESULTADOS-ELEITORAIS.md).

O comparativo por candidatura separa montagem pura (`election-comparison.ts`), consulta do servidor (`election-comparison-query.ts`) e interface (`candidate-comparison.tsx`). A referência inicial é conferida por candidatura/ano, nunca por número de urna isolado. Cada linha mantém zona + seção, valores ausentes permanecem nulos, e a API exige `reports.read`. A mudança de zona entre 2016 e 2020 é apresentada sem correspondência presumida de eleitorado.

## Identidade e autorização

Better Auth mantém login individual, senhas derivadas, cookies HttpOnly/SameSite=Lax e Secure em produção. Cadastro público bloqueado. Ativação por token de uso único. Logout e troca de senha são operações do usuário autenticado.

Cada API de negócio chama `requireActor`: lê sessão e consulta novamente usuário ativo, perfil habilitado e concessão no banco. A matriz estática estabelece o teto; concessão indevida no banco não amplia acesso. Escritas revalidam usuário e escopo na transação; versões evitam sobrescrita concorrente. Esconder botões não substitui autorização.

| Perfil | Acesso |
|---|---|
| Administrador geral | Operações, território, usuários e auditoria global |
| Coordenador | Operações, território, relatórios e consulta da equipe |
| Assessor | Operações sob sua responsabilidade e próprio histórico |
| Analista | Indicadores, território, relatórios e próprio histórico |
| Atendente de saúde | Reservado e desabilitado |

Todo usuário ativo consulta o próprio histórico. As dez permissões estão em `src/lib/permissions.ts`; concessões persistem nas tabelas roles, permissions e role_permissions. O assessor tem consultas restritas por responsável; analista não acessa cadastros pessoais operacionais.

## Integridade e privacidade

FKs, índices, checks e triggers protegem vínculos, agenda, telefone normalizado e autorizações. Contatos exigem base legal, finalidade e evidência; canais não são autorizados implicitamente. Ledger de autorizações e auditoria preservam alterações; auditoria é append-only. Desativar usuários preserva histórico.

Mutações validam origem e JSON. O leitor interrompe o stream acima do limite de bytes: 8 KiB comum e 2 MB territorial, mesmo sem Content-Length. Erros inesperados retornam mensagem genérica e requestId, sem conexão, senha ou stack. Respostas privadas usam no-store. Autenticação limita tentativas no banco. Cabeçalhos bloqueiam incorporação em frames, MIME sniffing e objetos incorporados; a política de referrer limita dados enviados a outras origens. A CSP é parcial e não restringe todos os scripts/mapas externos.

## Interface e entrega

Identidade visual e logo original preservadas. Estados vazios representam ausência real de registros. Limites de erro compartilham recuperação com retry() do Next instalado; global-error cobre falhas do layout. Há link para pular navegação, conteúdo focável, controles nativos, estados anunciados, foco visível e movimento reduzido. Listagem e entrada de coordenadas são alternativas ao mapa.

CI verifica tipos, testes, build, fronteira cliente/servidor e bundle antes do artefato Linux. O deploy publica o commit aprovado e aplica migrations controladas. Não há envio automático de e-mails, recuperação de senha por e-mail nem monitoramento externo configurados.

## Saúde independente (preparação)

`modules/health` contém schema e migrations separados, regras de acesso próprio, base legal, protocolos administrativos, documentos privados em quarentena, auditoria e contratos de retenção/exclusão. Não é importado pelo banco ou backend principal. `/saude` é apenas uma tela de preparação para o administrador, sem acesso a pacientes ou documentos. Banco, Worker, identidade, bucket e política de saúde precisam de configuração própria antes da ativação. Não existe integração com regulação oficial ou dados eleitorais. Veja `modules/health/README.md`.
