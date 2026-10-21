# Resultados eleitorais

## Limites e autorização

`/eleicoes` e `GET /api/elections` exigem `reports.read`: administrador, coordenador e analista. `POST /api/elections` exige `users.manage` e revalida administrador ativo, papel habilitado e concessão dentro da transação. Assessor e perfil de saúde não têm acesso. Importações verificam origem HTTP, tamanho do corpo e campos permitidos.

As tabelas `election_imports`, `election_results` e `election_places` não possuem relacionamento com contatos, comunidades ou saúde. Não existe cadastro de eleitor, CPF, título eleitoral, preferência individual ou inferência de voto. O ator da importação é registrado apenas na auditoria administrativa existente. Não usar estes resultados para atribuir preferências a pessoas ou cruzar dados de saúde.

## Importar votação por seção

Fonte: [Portal de Dados Abertos do TSE — resultados de 2024](https://dadosabertos.tse.jus.br/dataset/resultados-2024). Recurso verificado: [PE — votação por seção](https://dadosabertos.tse.jus.br/dataset/resultados-2024/resource/25a1936a-0e14-486a-bd4e-a5a57e348289). O cabeçalho foi conferido no CSV distribuído pelo TSE em 21/10/2026.

1. Baixe e extraia o ZIP oficial em ambiente confiável. A aplicação não baixa URLs e não extrai ZIP no Worker.
2. Prepare recortes do CSV, preservando seu cabeçalho original: até 2.000 linhas de dados e 1,5 MB por lote. Não abra/salve como planilha se isso modificar códigos ou truncar linhas. O navegador aceita UTF-8 e Windows-1252.
3. Informe a URL HTTPS de origem no domínio `tse.jus.br` e envie como administrador. Essa declaração e validação de domínio não constituem assinatura ou comprovação criptográfica da autenticidade do TSE.
4. Aguarde a confirmação. O lote inteiro é gravado ou revertido. SHA-256 dos dados normalizados impede reenvio idêntico. Alterações de votos na mesma chave substituem o valor, não somam. A linha mantém referência ao último lote e a auditoria preserva a importação.

Campos aceitos constam em `src/lib/election-input.ts`. Colunas desconhecidas são rejeitadas. Endereço, identificador de candidato e campos técnicos adicionais do CSV são descartados antes da persistência; são armazenadas apenas dimensões públicas e votos agregados. Layouts históricos diferentes precisam de adaptador e testes antes de uso; não há suporte genérico a qualquer arquivo do TSE.

Chave única: ano, código da eleição, turno, UF, município TSE, zona, seção, cargo e opção votável. Valores de votos inteiros não negativos, limites de números e coordenadas são validados no servidor e no banco. Divergência de local para uma seção na mesma eleição é rejeitada para revisão, evitando mistura silenciosa. Importações são serializadas por lock transacional. Histórico de lotes append-only na aplicação, sem exclusão pela interface.

## Coordenadas de locais

A camada geográfica usa tabela própria, por ano/UF/município/zona/local, sem geocodificação automática e sem coordenadas de contatos. Para preparar um arquivo oficial em outro layout, normalize em GeoJSON apenas os identificadores e pontos dos locais de votação. Informe a fonte oficial. Modelo:

```json
{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"year":2024,"uf":"PE","municipality":"99999","zone":1,"place":"1000"},"geometry":{"type":"Point","coordinates":[-35.6,-8.8]}}]}
```

Exemplo sintático fictício: não importar como informação oficial. Limite de 500 pontos por lote. `municipality` e `place` são strings com códigos TSE; `year` e `zone` são inteiros. Importe os resultados antes dos pontos. Não adicionar propriedades pessoais. Registros sem coordenadas continuam visíveis na tabela. A origem e o lote de cada ponto ficam preservados.

## Consulta e comparação

O seletor escolhe um único ano/eleição/turno/cargo/UF/município. A tabela de opções preserva nomes e códigos do arquivo, inclusive brancos, nulos ou legenda. Percentuais usam todos os votos do recorte importado, não somente votos válidos. Comparação histórica usa mesmo município/código de cargo/turno e separa códigos de eleição: não presume identidade de candidatos entre anos. Totais, quantidade de seções e locais ajudam a avaliar a cobertura; mudanças de seções, locais e abrangência impedem interpretar variações como migração de preferência individual.

Dados são sempre rotulados como cobertura potencialmente parcial. O catálogo exibe até 1.000 recortes, a votação até 500 opções, o mapa/tabela até 1.000 locais e o histórico até 100 eleições. Destina-se inicialmente à análise municipal. Não certifica completude de uma UF ou do país. Nenhum resultado oficial é pré-carregado nesta entrega.

## Cloudflare e manutenção

Sem dependências novas: Neon HTTP para leitura, Pool transacional existente para importação, Web Crypto para hash e MapLibre carregado apenas no cliente. Conexão permanece exclusivamente no servidor em variáveis privadas. Arquivos são processados em memória e descartados após importação; nenhum upload bruto é publicado. Não configurar estas tabelas como fonte para contatos, segmentação de pessoas ou saúde.

Testes: parser CSV e limites, URLs oficiais, duplicidade, valores inválidos, coordenadas, isolamento das consultas, contratos de autorização e testes HTTP em branch isolada. Antes de suportar outro layout oficial, adicionar fixtures e adapter explícito; não afrouxar a lista de colunas.
