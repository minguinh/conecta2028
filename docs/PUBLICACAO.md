# Publicação online

Repositório: https://github.com/minguinh/conecta2028
Destino: https://conecta2028.domingosfonseca.workers.dev

Após salvar e fazer commit das alterações, executar `node scripts/deploy-cloudflare.mjs`. O comando envia `main`, aguarda o CI do mesmo SHA, baixa o artefato produzido no Linux e publica na Cloudflare. Não publica se os testes ou a compilação falharem. Git Credential Manager e Wrangler precisam estar autenticados. O pacote de runtime não é compilado no Windows.

O CI executa typecheck, testes, compilação Next e OpenNext. O artefato é retido por três dias. `.cloudflare-artifacts/`, arquivos de ambiente e segredos são ignorados pelo Git. O script usa credenciais existentes sem imprimi-las. Novas migrações devem ser validadas previamente em branch isolada. Se `.env.production.local` existir, Drizzle aplica as migrações pendentes em produção antes do deploy. `.dev.vars.production`, quando presente, contém JSON com os segredos iniciais de runtime; nunca versioná-lo. As próximas publicações preservam os segredos já configurados no Worker.

Produção usa a branch `main` do Neon, separada de `development`. O cadastro inicial aberto continua bloqueado em produção. O primeiro administrador recebe um link de ativação individual e define sua própria senha.
