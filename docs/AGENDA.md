# Agenda

Rota autenticada `/agenda`, acessível pelo menu “Agenda de Visitas” e pelo botão do dashboard. Calendário mensal com 42 dias e semanas iniciando na segunda-feira; visualizações semanal e diária, navegação por período, seleção de data e filtros por status, tipo e responsável. No celular, a semana passa a uma lista de dias e o mês mantém rolagem horizontal para preservar as sete colunas.

Compromissos e visitas compartilham a tabela `visits`. Novos itens exigem título, início, término, tipo e responsável operacional ativo; localidade e descrição administrativa são opcionais. A duração máxima é de sete dias. Horários são apresentados e interpretados em Fortaleza (UTC−03:00), com timestamps armazenados no PostgreSQL. Itens que atravessam meia-noite aparecem nos dias correspondentes; o instante do término não ocupa o dia seguinte.

Administradores e coordenadores gerenciam todos os itens e distribuem responsáveis. Assessores consultam e alteram somente itens sob sua responsabilidade e só atribuem novos itens a si mesmos. Analistas não recebem detalhes individuais da agenda; o perfil de saúde permanece inativo. As verificações são feitas no servidor e revalidadas na transação de escrita.

Itens agendados podem ser editados, concluídos ou cancelados. A conclusão de uma visita exige a data real e relato administrativo, sem data futura. Para registrar uma visita já realizada, cadastrar seu horário passado, abrir o item e selecionar “Registrar visita realizada”. Itens concluídos e cancelados ficam visíveis no histórico do calendário e não são reabertos nesta versão. Controle de versão impede sobrescrita e conclusão concorrente.

Triggers registram as alterações na auditoria, com autor, campos alterados, status, tipo e versão, sem copiar o relato. A conclusão cria uma atividade no mesmo commit, respeitando o responsável e a localidade e sem duplicar atividades em tentativas concorrentes. O dashboard mostra os cinco próximos compromissos agendados e a agenda do dia; itens cancelados/concluídos não aparecem como próximos. O indicador de visitas conta apenas o tipo visita, ainda agendado e futuro.

Migrações: 0009 amplia a tabela sem inventar conteúdo para registros existentes; 0010 adiciona índice, validação e auditoria. Para itens legados sem término, a visualização considera uma hora apenas como duração de exibição, sem preencher esse valor no banco. A edição exige informar o término explicitamente.

Validação em branch Neon schema-only isolada: sessões reais dos quatro perfis, criação, atribuição, localidades, filtros, fronteira de datas, edição, conflito de versão, relato obrigatório, rejeição de realização futura, conclusão concorrente, atividade única, cancelamento, auditoria e próximos itens no dashboard. Nenhum registro de teste é inserido em produção.
