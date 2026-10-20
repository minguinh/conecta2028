# Cadastro de contatos

Rota autenticada `/contatos`, acessível pelo menu. Administradores e coordenadores acessam e editam os contatos; assessores acessam e editam somente registros atribuídos a eles. Novos registros são atribuídos ao usuário criador. Analistas e o perfil futuro de saúde não acessam os dados individuais.

Campos: nome, telefone brasileiro com DDD, localidade obrigatória, endereço opcional, observações administrativas, base legal, finalidade, registro da base e autorizações independentes para WhatsApp, SMS e ligações. Nenhum canal vem marcado. A aplicação exige justificativa/evidência, mas não determina automaticamente a adequação jurídica da base selecionada. O consentimento para tratamento não é presumido como autorização de comunicação.

A interface permite retirar autorizações e registrar a revogação. Não há disparo de mensagens. Não existem campos de preferência política ou integração de dados de saúde; a API rejeita campos fora da lista administrativa permitida. Campos livres exigem uso responsável: a aplicação não faz classificação semântica do conteúdo digitado.

Busca por nome ou telefone, filtros de localidade, base legal e canal, paginação de 25 registros e edição com controle de versão. Telefone é normalizado para `55 + DDD + número`. Índice único no PostgreSQL bloqueia duplicidades inclusive em requisições concorrentes. Nesta primeira versão, um telefone só pode pertencer a um cadastro; telefones familiares compartilhados precisam de tratamento futuro antes de permitir exceções. Nomes iguais são permitidos para não bloquear homônimos.

Alterações e permissões de comunicação são registradas por trigger no mesmo commit do contato. O histórico inclui autor, data, campos alterados, versão, base legal e estado dos canais; não duplica nomes, telefone, endereço, observações ou evidências anteriores. Histórico por contato é limitado ao mesmo escopo de autorização e às últimas 100 entradas. A auditoria existente bloqueia alteração, exclusão e truncamento de registros de log.

As migrações 0007 e 0008 ampliam a tabela existente sem inventar telefone, base legal ou consentimento para registros antigos. Registros legados sem base podem ser filtrados como pendentes de revisão e só podem ser salvos após completar os campos exigidos. As constraints também são aplicadas às novas escritas no banco.

Validação: testes unitários de normalização, campos obrigatórios e rejeição de campos extras; teste HTTP em branch Neon isolada com sessões reais dos quatro perfis, autorização, duplicidade concorrente, filtros, edição, revogação, conflitos de versão e auditoria imutável.
