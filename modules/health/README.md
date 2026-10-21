# Saúde — preparação de serviço independente

**Estado:** arquitetura, modelo, migration, regras de autorização/base legal/retenção e adaptador privado preparados. Ainda não existe API operacional de saúde, integração de identidade, bucket provisionado, antivírus ou rotina de exclusão implantada. A tela `/saude` da aplicação principal informa essa preparação; não recebe nem consulta dados de saúde.

## Isolamento obrigatório

Implantar um Worker e banco Neon próprios, com credenciais diferentes, e um bucket R2 privado exclusivo. Não usar o DATABASE_URL da aplicação principal. O schema health tem somente vínculos internos; não há FK para contatos, comunidades, demandas, campanha ou usuários da aplicação principal. O identificador de identidade é opaco e a associação de atendentes pertence ao serviço de saúde. O schema não é carregado por `src/db` nem pelas migrations principais. Não exportar dados, documentos, protocolos ou indicadores de saúde a módulos eleitorais, comunicação política ou relatórios do painel.

O serviço de identidade futuro deve validar assinatura, emissor, audiência, validade e sessão revogável antes de obter memberships no servidor. Não aceitar cargo, sujeito ou principal enviados pelo navegador. Sem esse adaptador, nenhuma rota de dados pode ser ativada. Não compartilhar cookies, secrets ou tokens do painel para autorizar saúde automaticamente. Administrador geral do painel não ganha acesso a prontuários/documentos.

## Permissões específicas

- Atendente de saúde: solicitações atribuídas a si, documentos e registro de base legal.
- Supervisor de saúde: solicitações da equipe de saúde e auditoria.
- Encarregado de privacidade de saúde: base legal, auditoria e execução de retenção; sem leitura automática de documentos.

`policy.ts` recusa perfis gerais, contas inativas, identidade não autenticada, registros restritos e acesso fora da responsabilidade. Essas funções são regras do domínio; o futuro servidor ainda deve carregar identidade, membership, atribuição e política de fontes confiáveis e validar autorização em cada operação. O perfil reservado na aplicação principal continua desabilitado.

## Dados e protocolos

Nome necessário ao atendimento, contato opcional, tipo administrativo (exame, consulta ou cirurgia), protocolo aleatório, atendente, versão, andamento, política e expiração. Não há CPF, cartão SUS, diagnóstico, CID, prioridade clínica, posição em fila ou campo para modificar agendamento oficial. Estados: recebida, documentação pendente, encaminhada, aguardando retorno, encerrada e cancelada. Esses estados não representam situação oficial de regulação. Notas limitadas a 500 caracteres e somente encaminhamentos administrativos.

## Base legal e consentimento

Nenhuma base é presumida. Antes de liberar o registro restrito, exigir finalidade específica, referência de evidência, versão do aviso, data e responsável pela validação. Consentimento exige manifestação explícita; outra base exige referência e aprovação registrada. Os valores técnicos não determinam a adequação jurídica da base: a equipe responsável deve avaliar cada finalidade, inclusive dados sensíveis.

Fluxo de revogação: registrar data/evento → restringir imediatamente consultas e documentos → encaminhar à privacidade → avaliar outra base efetivamente aplicável ou exclusão. Não trocar automaticamente a base apenas para manter o tratamento. O servidor deverá registrar concessão, revisão, recusa e revogação; o schema preserva eventos até a exclusão autorizada.

## Documentos privados

`private-documents.ts` valida tamanho (8 MB) e assinaturas PDF/JPEG/PNG. Armazena com chave aleatória, sem nome ou documento pessoal no caminho, em quarentena. Download só após verificação e mudança autorizada para disponível. O analisador de malware deve ser integrado antes da ativação; reconhecer a assinatura de um arquivo não prova sua segurança.

Não habilitar r2.dev, domínio público, CORS amplo nem URLs públicas ou pré-assinadas. O Worker deve devolver o arquivo por endpoint autenticado, após permissão e log durável, com no-store, attachment e nosniff. A auditoria indisponível bloqueia a leitura. Persistir metadados e limpar órfãos/quarentena com rotina compensatória, sem liberar arquivos antes da conclusão do fluxo.

O adaptador não está conectado a uma API. As chamadas de `log`, membership, política e metadata devem vir do servidor, nunca do cliente. Logs não contêm corpo do documento, nome, telefone ou descrição clínica.

## Retenção e exclusão

Não há prazo padrão. A ativação exige política versionada e aprovada para solicitações, auditoria e backups. Cada solicitação recebe expires_at; eventual suspensão exige referência e data final, sem retenção indefinida. `retention.ts` organiza: elegibilidade → reserva atômica do job e restrição do registro → exclusão idempotente dos objetos → exclusão transacional dos dados e conclusão → comprovante mínimo com expiração. Falha em R2 impede conclusão e remoção prematura das referências; o job deve ser retomado.

O agendador e adaptadores transacionais ainda precisam ser implementados e implantados, com credenciais de retenção próprias. A auditoria é append-only para o serviço comum; uma identidade de banco exclusiva `health_retention_service` poderá excluir apenas eventos já expirados. A política deve tratar expiração dos backups e reaplicação de exclusões após restauração. Não afirmar que houve eliminação completa enquanto documentos ou cópias recuperáveis abrangidas pela política permanecerem retidos.

## Verificação isolada

`pnpm test` cobre permissões, base legal, retenção, arquivos e falhas de exclusão. `scripts/verify-health-schema.mjs` requer banco descartável vazio chamado health_test e `.env.health-security` com HEALTH_DATABASE_URL_UNPOOLED e HEALTH_SECURITY_TEST=true. Valida as migrations, FKs internas, contexto de auditoria obrigatório, histórico, liberação com base legal, restrição após revogação e imutabilidade da auditoria. Nunca usar dados reais.

## Migrations e ativação

Gerar com `pnpm exec drizzle-kit generate --config modules/health/drizzle.config.ts`. Aplicar exclusivamente em banco independente com `HEALTH_DATABASE_URL_UNPOOLED` usando `pnpm exec drizzle-kit migrate --config modules/health/drizzle.config.ts`. Testar antes em banco descartável. Não incluir esse comando no deploy da aplicação principal.

Antes de ativar: configurar identidade e memberships próprios, política aprovada, atendimento aos direitos do titular, Worker/API com autorização em todos os handlers, bucket privado, antivírus, logs de acesso/mutação, transações, job de retenção, expiração de backups, credenciais de menor privilégio e testes de isolamento. A preparação não autoriza integração com regulação: nenhuma API oficial, sincronização, fila, prioridade clínica ou agendamento oficial foi implementado.

Referências: [LGPD, texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), especialmente dados sensíveis e término do tratamento; [privacidade de buckets R2](https://developers.cloudflare.com/r2/buckets/public-buckets/). A definição de base aplicável e prazos cabe à política aprovada, não a um valor escolhido automaticamente pelo aplicativo.
