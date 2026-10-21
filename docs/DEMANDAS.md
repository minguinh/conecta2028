# Demandas

`/demandas` reúne cadastro, consulta, busca por título, filtros de categoria, prioridade, localidade, responsável e status, paginação, edição, conclusão/cancelamento e histórico. A navegação “Demandas” do painel e dos cadastros leva à rota real.

Campos: título, categoria, prioridade, responsável ativo, localidade opcional, prazo opcional, descrição administrativa e solução/motivo de cancelamento no encerramento. Novas demandas começam em andamento. Podem passar para aguardando retorno, concluída ou cancelada. Após encerrar, permanecem disponíveis para consulta e não são sobrescritas. Para uma nova ocorrência, cadastre outra demanda.

Administrador e coordenador gerenciam a equipe inteira. Assessor consulta e altera somente demandas atribuídas a si e não as transfere para terceiros. Analista não acessa registros operacionais; vê os indicadores agregados do painel. As APIs exigem autorização no servidor, inclusive no histórico.

A migration 0015 amplia a tabela existente com descrição, prioridade, prazo, resolução, encerramento, versão e data de atualização. Checks validam tamanho, prioridade e coerência do encerramento; índices atendem responsável, status, localidade e prazo. A versão evita sobrescrita concorrente; demandas encerradas não podem ser editadas. Auditoria registra responsável, campos alterados e status, sem copiar descrição ou resolução. Atividades de cadastro/alteração alimentam o painel e o gráfico por localidade na mesma transação.

Os indicadores são reais e respeitam o escopo de acesso. Não criar dados de demonstração na produção. Descrições são administrativas: não registrar preferências políticas individuais ou informações clínicas/de saúde.

## Abertura dos cadastros

Os módulos implementados têm atalhos de navegação e links reais. Formulários de contatos, localidades e agenda aparecem antes dos resultados, com foco no campo inicial. Botões de ação aguardam a hidratação dos handlers; links nativos continuam funcionando antes dela. O mapa continua disponível para escolher coordenadas. Contatos exigem uma localidade prévia; a interface destaca essa dependência e oferece o link para cadastrá-la. Áreas ainda sem fluxo implementado aparecem desabilitadas, sem simular uma tela funcional.

Validação: `pnpm test`, `pnpm check`, teste HTTP integrado `scripts/verify-registrations-http.mjs` em branch descartável e revisão por navegador da abertura e salvamento. As fixtures ficam somente no banco de testes.
