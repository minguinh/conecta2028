# CONECTA Saúde — serviço assistencial independente

Worker: https://conecta2028-saude.domingosfonseca.workers.dev/

Cadastro de pacientes, solicitações de exames/consultas/cirurgias, checklist, edição com versão, histórico e requisições médicas visíveis na própria ficha. O painel principal `/saude` contém somente um link para este serviço; não consulta dados assistenciais.

## Isolamento e permissões

Banco Neon, Worker, Better Auth, memberships, chaves e cookies próprios. Não há importação de contatos, FKs, IDs comuns ou exportação de dados para módulos eleitorais. O administrador geral do painel não ganha acesso assistencial. Não existe integração com regulação oficial nem alteração de filas, prioridades clínicas ou agendamentos oficiais.

- Atendente: apenas fichas e solicitações sob sua responsabilidade.
- Supervisor: fichas da equipe, validação de outra base e auditoria.
- Encarregado de privacidade: permissões específicas do domínio; sem leitura automática de documentos. A interface de gestão de equipe/privacidade não está incluída nesta versão.

Sessão revogável de oito horas, cookie host-only Secure/HttpOnly/SameSite, sem cache de sessão, cadastro público desabilitado e limite persistente de tentativas de login. Convite de uso único, senha individual de 12–128 caracteres definida pela pessoa. Não há senha padrão ou envio automático de e-mails. Recuperação exige verificação pela supervisão e novo convite controlado.

Nome obrigatório; telefone opcional; CPF, CNS/SUS, identidade e nascimento opcionais, com justificativa quando preenchidos. Identificadores e detalhes dos procedimentos usam AES-256-GCM com AAD por registro. CPF/CNS usam HMAC para prevenir duplicidade. Nome e telefone ficam acessíveis somente ao serviço autorizado. Não registrar informações clínicas desnecessárias em notas administrativas.

Cada solicitação exige finalidade, evidência, aviso versionado e consentimento explícito ou outra base validada pela supervisão. A entrega de documentos não preenche a autorização automaticamente. Revogação restringe imediatamente solicitação e anexos; a ficha também fica inacessível se nenhuma solicitação tiver base ativa.

## Upload e visualização privada

R2 não estava habilitado na conta. Esta versão armazena arquivos em `health.private_blobs`, no **banco exclusivo de saúde**, sem bucket ou URL pública. Originais de até 8 MB (PDF/JPG/PNG) são validados por assinatura, criptografados e divididos em blocos. Permanecem em quarentena, **sem endpoint de download ou liberação automática**.

O navegador gera até seis páginas PNG por arquivo. PDF.js é usado somente para renderização em canvas, sem executar ações ou scripts do documento. Imagens também passam por canvas. O atendente confere as páginas antes do envio. O servidor aceita apenas PNG RGBA limitado, verifica tamanho, dimensões, expansão DEFLATE e CRC, descarta metadados e reencodifica os pixels. Isso não equivale a antivírus nem comprova a correspondência entre original e cópia; cabe ao atendente conferir. A disponibilização futura do original depende de análise de malware.

Limites: cinco anexos por solicitação, seis páginas por anexo, 1 MB por prévia, 2 milhões de pixels por página e corpo multipart de até 16 MB. PDF.js e recursos são servidos na mesma origem. Sem analytics, fichas em localStorage ou service worker.

A leitura acontece em modal dentro da ficha, com paginação. `GET /api/documents/:id/pages/:n` exige sessão, membership, atribuição, validade, base e auditoria durável antes de servir PNG com no-store e nosniff. Falha de auditoria impede a leitura. Não há links públicos nem envio a analisadores externos.

## Auditoria, retenção e exclusão

Responsável confirmado: Domingos Leandro da Fonseca Junior. Política `assistencial-6-anos-2026-10-22`: **seis anos calendários por solicitação**. Nova solicitação estende somente a ficha mestre até a maior expiração; não prolonga anexos ou solicitações anteriores. Fichas e solicitações vencidas são bloqueadas antes da limpeza física.

Triggers exigem ator ativo e contexto e registram alterações sem copiar conteúdo clínico. Logs append-only para runtime; apenas `health_retention_service` pode excluir logs expirados. Cron diário às 06:17 UTC remove solicitações vencidas em lotes de 25 com cascata transacional para documentos, blobs, bases e histórico, remove fichas vencidas sem solicitações e grava comprovantes mínimos em erasure_jobs. Suspensão exige referência e data final. Monitorar falhas do agendador; o procedimento de privacidade supervisiona pedidos antecipados de exclusão e obrigações de conservação.

O projeto Neon foi verificado com janela de restauração/PITR de **21.600 segundos (6 horas)**. A exclusão na base ativa não remove instantaneamente cópias recuperáveis do provedor. Após restauração, reaplicar comprovantes de exclusão e rodar a limpeza antes de reabrir acesso. Só afirmar destruição completa após expiração das cópias abrangidas pela política. Manter chave AES em backup privado, com acesso restrito e plano de rotação.

## Verificação e implantação

```sh
pnpm exec tsc -p modules/health/tsconfig.json --noEmit
pnpm test
node scripts/build-health.mjs
pnpm exec wrangler deploy --config modules/health/wrangler.jsonc --dry-run
```

UI React/TypeScript compilada com esbuild, API Worker nodejs_compat e portal principal Next.js App Router. PDF.js é exclusivo do navegador. A sanitização usa fast-png/fflate em JavaScript puro; pngjs usa internos zlib incompatíveis com Worker e fica apenas nas fixtures de teste.

Migrations Drizzle exclusivas em modules/health/migrations, incluindo health_auth. Nunca aplicar no banco principal. `scripts/provision-health.mjs` verifica banco/região, aplica migrations e concessões mínimas e provisiona o supervisor inativo com convite de sete dias, entregue privadamente. Não define senha. Nome e e-mail vêm de HEALTH_SUPERVISOR_NAME e HEALTH_SUPERVISOR_EMAIL no arquivo privado `.env.health-setup`. O script está vinculado ao projeto assistencial e requer conexão de proprietário em `.cloudflare-artifacts/health-owner.txt`, nunca enviada ao Worker. Para outro ambiente, revisar identificadores e provisionamento antes de executar.

Testes de integração exigem banco descartável health_test, `.env.health-security` e HEALTH_SECURITY_TEST=true. `scripts/verify-health-schema.mjs` valida integridade e auditoria. `scripts/verify-health-http.mjs` aponta exclusivamente para o Worker de teste e cria somente fixtures fictícias; valida autenticação, consentimento, escopo, versões, criptografia, upload, leitura, falha de auditoria e revogação. `node --import tsx scripts/verify-health-retention.mjs` valida expiração, cascata dos anexos, suspensão e comprovantes idempotentes. Descartar Worker e banco de teste após a verificação. Não copiar dados reais.

O CI valida tipos/testes e builds de ambos os serviços. `node scripts/deploy-cloudflare.mjs` aguarda o CI do mesmo commit e publica ambos, chamando `scripts/deploy-health.mjs` com artefato assistencial aprovado. Secrets próprios em `modules/health/.dev.vars.production`, nunca no Worker principal. Conferir BUILD_ID nos dois serviços, APIs sem sessão e fluxos autenticados. Exemplos sem segredos em `.env.example`.
