# CONECTA 2028

Gestão comunitária de Xexéu com território, contatos com base legal, agenda, demandas, equipe e auditoria. Indicadores consultam o Neon e mostram estados vazios quando não há registros.

Produção: https://conecta2028.domingosfonseca.workers.dev/
Repositório: https://github.com/minguinh/conecta2028

## Tecnologias

Next.js 16 App Router, TypeScript, React, Tailwind CSS, shadcn/ui, Lucide, MapLibre GL JS, Drizzle, Neon PostgreSQL/PostGIS e Better Auth. Cloudflare Workers por OpenNext. Banco e autenticação são exclusivos do servidor.

## Desenvolvimento

Recomendado Node.js 24 e pnpm 11.25.0. Configure um banco de desenvolvimento isolado:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Preencha as variáveis privadas.
pnpm db:migrate
pnpm dev
```

Endereço local: http://127.0.0.1:3000. BETTER_AUTH_URL deve corresponder à origem do navegador. Gere BETTER_AUTH_SECRET com pelo menos 32 bytes aleatórios e armazene-o somente no ambiente privado. Use conexão Neon com TLS; DATABASE_URL_UNPOOLED direta para migrations.

Primeiro administrador em desenvolvimento: habilite ALLOW_LOCAL_ADMIN_SETUP=true e acesse /configuracao-inicial em loopback, com tabela de usuários vazia. Depois desabilite a opção. Esse fluxo é bloqueado em produção. A administração provisiona contas e entrega links de ativação de uso único, válidos por 24 horas. Não há senha padrão nem envio automático de e-mails configurado. Nunca publique links de ativação em logs ou commits.

## Verificações

```sh
pnpm check
pnpm test
pnpm build
node scripts/verify-client-bundle.mjs
```

Testes unitários não exigem credenciais. Testes HTTP exigem branch Neon descartável; consulte a documentação de qualidade. O CI Linux executa tipos, testes, build e verificação do bundle antes de empacotar o Worker.

## Implantação

1. Autentique Git/GitHub e Cloudflare: pnpm exec wrangler login.
2. Configure secrets do Worker: DATABASE_URL (pooled), BETTER_AUTH_SECRET e BETTER_AUTH_URL (URL HTTPS pública). Nunca use NEXT_PUBLIC_ para credenciais.
3. Teste migrations em branch isolada e revise o SQL. Configure .env.production.local privado com as conexões de produção para migrations. Opcionalmente configure .dev.vars.production privado como JSON com os três secrets de runtime; sem esse arquivo, mantenha-os já configurados na Cloudflare.
4. Execute verificações, faça commit e mantenha a árvore limpa.
5. Execute node scripts/deploy-cloudflare.mjs. Ele envia main, aguarda o CI do mesmo commit, baixa o artefato Linux, aplica migrations se o arquivo privado existir e publica com Wrangler preservando variáveis.
6. Confirme a versão e compare /BUILD_ID remoto com .open-next/assets/BUILD_ID. Verifique login, bloqueio de APIs sem sessão e fluxos autenticados online.

O script está vinculado a este repositório/branch; ajuste identificadores para outro projeto. Builds OpenNext rodam no Linux para evitar incompatibilidades de symlinks e binários nativos no Windows. O fluxo por artefato é o caminho validado de entrega. Não aplique migrations de produção sem revisar e validar recuperação do banco.

Arquivos .env*, .dev.vars*, dependências e artefatos são ignorados, exceto exemplos sem valores. Toda entrega deve estar sincronizada no GitHub e online; localhost serve ao desenvolvimento.

## Documentação

- [Arquitetura](docs/ARQUITETURA.md)
- [Qualidade e segurança](docs/QUALIDADE-E-SEGURANCA.md)
- [Banco e migrations](docs/BANCO-DE-DADOS.md)
- [Usuários](docs/GESTAO-USUARIOS.md)
- [Território](docs/CADASTRO-TERRITORIAL.md)
- [Contatos](docs/CADASTRO-CONTATOS.md)
- [Agenda](docs/AGENDA.md)
- [Demandas e abertura dos cadastros](docs/DEMANDAS.md)
- [Saúde: arquitetura independente em preparação](modules/health/README.md)

Relatórios completos e comunicação têm áreas em preparação. Perfil de saúde reservado e desabilitado. Não registrar preferências políticas individuais nem usar saúde para fins eleitorais. Logomarca original preservada em public/branding/logo-minguinho.png; menu usa sua versão transparente.
