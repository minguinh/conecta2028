# Gestão de usuários e autorização

## Perfis aprovados

| Ação | Administrador geral | Coordenador | Assessor | Analista |
| --- | --- | --- | --- | --- |
| Dashboard | Completo | Completo | Somente registros atribuídos | Indicadores agregados |
| Operações | Leitura e escrita | Leitura e escrita | Leitura e escrita nos próprios registros | Sem escrita |
| Relatórios | Sim | Sim | Não | Somente leitura |
| Consultar equipe | Sim | Sim | Não | Não |
| Criar contas, atribuir perfis, ativar/desativar | Sim | Não | Não | Não |
| Auditoria global | Sim | Não | Não | Não |
| Histórico individual | Sim | Sim | Sim | Sim |

`atendente_saude` é uma função reservada: não é atribuível pelos endpoints, não recebe permissões e não pode ter `active=true`, por constraint no PostgreSQL. Não dá acesso a informações de saúde.

Os módulos de operações e relatórios continuam previstos para etapas seguintes. A matriz já centraliza suas permissões; qualquer novo handler deve chamar `requireActor` e aplicar o escopo correspondente. No dashboard já existente, a filtragem de atribuição é executada em SQL e os detalhes de agenda/histórico são removidos da resposta ao analista.

## Primeiro acesso

1. Em desenvolvimento local, abra `/configuracao-inicial`.
2. Cadastre seu nome, e-mail individual e senha pessoal de pelo menos 12 caracteres.
3. Entre em `/entrar`. Em `Equipe`, gerencie as contas.

A configuração inicial exige `NODE_ENV=development`, `ALLOW_LOCAL_ADMIN_SETUP=true`, host loopback e mesma origem. Em produção ela fica bloqueada. Um lock transacional impede duas configurações iniciais concorrentes; qualquer usuário existente fecha o bootstrap. A senha inicial deve ser digitada pelo próprio responsável; não há usuário ou senha padrão.

## Cadastro e ativação

O administrador informa nome, e-mail e perfil. A conta nasce inativa. O servidor devolve um link de ativação com token aleatório de 256 bits, uso único e validade de 24 horas. O banco armazena apenas SHA-256 do token. O token aparece no fragmento da URL, é removido da barra ao abrir a tela e é enviado somente no corpo do POST de ativação. A pessoa define sua própria senha; não há senha compartilhada ou temporária.

O aplicativo não envia mensagens. A interface permite copiar o link para que o administrador o entregue pelo canal apropriado. Renovar a ativação invalida todos os links anteriores. Contas já ativadas não recebem novos links por essa função.

Alterações de perfil ou status revogam as sessões e os links de ativação. O administrador não pode remover o próprio acesso administrativo. Um lock comum e uma segunda conferência do perfil dentro da transação impedem escalada por alterações concorrentes.

## Sessões e proteção dos endpoints

- Better Auth mantém login individual e hash scrypt; senhas de 12 a 128 caracteres. Cadastro público está fechado.
- Cookies HttpOnly, SameSite=Lax e Secure em produção; sessão de 8 horas com atualização a cada 15 minutos e cache de sessão desativado.
- O servidor relê o usuário, status e perfil no Neon a cada autorização. Valores enviados pelo navegador nunca decidem o perfil.
- Rate limiting persistente no banco, incluindo limite específico no login. Ativação e bootstrap possuem limite global adicional atômico.
- POST/PATCH próprios exigem JSON e origem exata configurada em `BETTER_AUTH_URL`; as verificações nativas do Better Auth também permanecem habilitadas.
- Rotas públicas do Better Auth foram limitadas a login, consulta de sessão, logout e troca da própria senha. Alteração de papel por `/update-user`, cadastro aberto e endpoints administrativos paralelos são bloqueados.
- `GET /api/users`: somente administrador e coordenador; criação e edição: somente administrador.
- `GET /api/audit`: todos veem o próprio histórico. Filtros para outra pessoa e consulta global exigem `audit.read`.
- As respostas protegidas usam `Cache-Control: private, no-store`.

A prévia que liberava o dashboard sem sessão foi removida. Nem mesmo em desenvolvimento o dashboard faz consulta de negócio sem login.

## Auditoria

`audit_logs` registra autor, usuário relacionado, ação, resultado, data e metadados limitados. Senhas, hashes de senha, tokens de ativação e cookies nunca são registrados. Gatilhos registram criação/alteração de usuário, mudanças de perfil/status, criação/revogação de sessão e troca de senha. Gatilhos de negócio cobrem contatos, comunidades, visitas, demandas e atividades, armazenando somente o ID do registro, sem duplicar conteúdo pessoal.

Alterações administrativas, ativação e bootstrap são transacionais via driver Neon WebSocket. A gravação auditada e a alteração de negócio confirmam ou falham juntas. Auditoria de sessões é feita pelo próprio PostgreSQL, na mesma transação da escrita.

UPDATE, DELETE e TRUNCATE dos logs são recusados por gatilhos. Isso protege contra alteração normal pela aplicação; não oferece imutabilidade contra o proprietário do banco, que pode alterar o schema. Para retenção imutável regulatória, seria necessário um destino separado e permissões operacionais próprias.

A trilha de auditoria é separada de `activities`: logins não contam como ações comunitárias no dashboard.

## Rotas e arquivos

- `/usuarios`: consulta da equipe e gestão administrativa.
- `/historico`: histórico individual; administrador pode consultar a trilha global ou uma pessoa.
- `/minha-conta`: perfil atual, logout e troca da própria senha.
- `/ativar`: definição inicial da senha a partir do link.
- `src/lib/permissions.ts`: matriz central de permissões e escopos.
- `src/lib/authorization.ts`: validação de sessão e autorização no servidor.
- `src/lib/user-management.ts`: operações transacionais.
- Migrações `0002` a `0004`: perfis, convites, atribuição, rate limiting e auditoria.

## Validação

Os testes unitários cobrem negação por padrão, perfis desconhecidos, papel de saúde inativo e parametrização do escopo de assessor. `scripts/verify-users-http.mjs` testa o ciclo de acesso real em uma branch Neon isolada com servidor local na porta 3002; não deve apontar para uma branch com registros reais. O script recusa um banco que já contenha usuários.

O servidor auxiliar carrega `.env.security` e usa `.next-security`, sem substituir a conexão da aplicação principal. Fixtures de teste não são inseridas em `development`. Remova a branch temporária e as credenciais de teste após a validação.

Validação executada em 20/10/2026: seis testes unitários aprovados; integração HTTP real com quatro perfis, bootstrap de uso único, ativação de uso único, bloqueio CSRF, proteção contra escalada de privilégio, escopo de assessor, agregação do analista, desativação de conta e revogação imediata. Testes adicionais verificaram troca de senha, revogação obrigatória mesmo com parâmetro de cliente contrário, logout, rate limiting persistente e bloqueio do perfil de saúde no PostgreSQL. UPDATE/DELETE/TRUNCATE de auditoria foram recusados. Typecheck e build de produção Next.js aprovados. A verificação final confirmou zero usuários e zero dados de negócio na branch `development`. A branch temporária `authorization-check` e seu arquivo de credenciais foram removidos após a execução.

## Limites desta etapa

Ainda não há envio de e-mail, recuperação de senha por e-mail ou MFA. O usuário pode trocar sua senha estando autenticado; recuperação após esquecimento precisa de fluxo próprio. Cadastros operacionais, relatórios completos e atendimento de saúde serão implementados nas respectivas etapas. Não houve deploy Cloudflare; a limitação Windows/OpenNext continua documentada.
