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

### Comparativo de candidaturas por seção

O painel **Comparativo por candidato** consulta `GET /api/elections/comparison`, protegido por `reports.read`, e usa apenas resultados públicos para vereador (cargo 13), primeiro turno, Xexéu–PE (23060), nos anos de 2016, 2020 e 2024. O usuário pode selecionar explicitamente a candidatura de cada ano, buscar uma zona/seção e baixar a matriz em CSV. O gráfico e os totais usam a candidatura inteira; a busca filtra as linhas exibidas, sem mudar os totais ou a exportação.

A referência inicial solicitada pelo proprietário é **DOMINGOS LEANDRO DA FONSECA JUNIOR**. A correspondência foi conferida nos arquivos oficiais por nome, município, cargo, eleição, número de urna e identificador público de candidatura:

| Ano | Eleição TSE | Número | SQ_CANDIDATO da fonte | Votos | Zona | Seções com registro |
|---|---|---|---|---:|---:|---:|
| 2016 | 220 | 45555 | 170000013481 | 646 | 37 | 32 |
| 2020 | 426 | 40000 | 170000747959 | 564 | 38 | 33 |
| 2024 | 619 | 45000 | 170002130211 | 495 | 38 | 35 |

O número **45555 de 2024 pertence a outra candidatura** e não é usado automaticamente na referência de Domingos. O mapeamento explícito fica em `src/lib/election-comparison.ts`; não há vínculo com o cadastro de contatos ou inferência automática de identidade entre anos. Se os identificadores e o nome esperados não estiverem no banco, o ano permanece sem candidatura confirmada.

**Mudança de zona e numeração:** o arquivo de 2016 contém zona 37, seções 150–181. Os de 2020/2024 contêm zona 38, seções 140–172, com 190 e 192 também presentes em 2024. A chave de linha é **zona + seção**: o painel mantém 67 pares históricos distintos e não força correspondência entre zonas diferentes. Não foi importada uma tabela oficial de equivalência entre essas numerações. Comparar a mesma numeração não comprova permanência do mesmo eleitorado.

Os registros ausentes aparecem como **“—”**, nunca como zero presumido. Zero é exibido somente quando existe explicitamente na linha da fonte. A diferença 2024 menos 2020 só é calculada quando os dois registros da mesma zona/seção existem; cada célula conserva o código e o nome do local daquele ano. Não há estimativas de votos individuais nem recomendações de segmentação de pessoas.

Em 21/10/2026 também foi importado o recorte municipal de [2016, votação por seção — PE](https://dadosabertos.tse.jus.br/dataset/resultados-2016): 1.193 registros agregados de prefeito/vereador, 32 seções e cinco locais. As coordenadas de 2016 não foram importadas nem estimadas. O arquivo oficial é compatível com o layout validado existente. O [manifesto do comparativo](data/domingos-comparativo-2016-2024.json) registra as candidaturas, os votos por seção verificados contra as três fontes, os totais e a origem/auditoria do lote de 2016.

O preparador aceita agora `--year 2016`; `--places-zip` é opcional, permitindo preparar somente resultados quando não houver arquivo geográfico conferido para o ano. O código publicado não contém votos fixos para a interface: os valores são consultados no Neon. Os arquivos JSON da documentação são comprovantes da conferência, e não fonte de dados do painel.

Testes cobrem número de urna reutilizado por outro candidato, escolha explícita, identificadores inválidos, zero versus ausência, mudança de zona com seção homônima, soma por candidatura, CSV e restrições de acesso. Os testes HTTP rodam exclusivamente no banco isolado `electoral_test`.

O seletor escolhe um único ano/eleição/turno/cargo/UF/município. A tabela de opções preserva nomes e códigos do arquivo, inclusive brancos, nulos ou legenda. Percentuais usam todos os votos do recorte importado, não somente votos válidos. Comparação histórica usa mesmo município/código de cargo/turno e separa códigos de eleição: não presume identidade de candidatos entre anos. Totais, quantidade de seções e locais ajudam a avaliar a cobertura; mudanças de seções, locais e abrangência impedem interpretar variações como migração de preferência individual.

Dados são sempre rotulados como cobertura potencialmente parcial. O catálogo exibe até 1.000 recortes, a votação até 500 opções, o mapa/tabela até 1.000 locais e o histórico até 100 eleições. Destina-se inicialmente à análise municipal. Não certifica completude de uma UF ou do país. Nenhum resultado oficial é pré-carregado nesta entrega.

## Cloudflare e manutenção

Sem dependências novas: Neon HTTP para leitura, Pool transacional existente para importação, Web Crypto para hash e MapLibre carregado apenas no cliente. Conexão permanece exclusivamente no servidor em variáveis privadas. Arquivos são processados em memória e descartados após importação; nenhum upload bruto é publicado. Não configurar estas tabelas como fonte para contatos, segmentação de pessoas ou saúde.

Testes: parser CSV e limites, URLs oficiais, duplicidade, valores inválidos, coordenadas, isolamento das consultas, contratos de autorização e testes HTTP em branch isolada. Antes de suportar outro layout oficial, adicionar fixtures e adapter explícito; não afrouxar a lista de colunas.

## Carga oficial de Xexéu — 21/10/2026

Foram importados pelo formulário autenticado de produção os recortes de Xexéu–PE, código TSE **23060**, zona **38**, das eleições municipais de 2020 e 2024, primeiro turno. A carga inclui prefeito e vereador, com as opções votáveis constantes no CSV (inclusive branco, nulo e legenda), sem dados individuais de eleitores.

| Ano | Registros de votação | Seções | Locais | Votos por cargo, incluindo brancos e nulos |
|---|---:|---:|---:|---:|
| 2020 | 1.189 | 33 | 5 | 8.549 |
| 2024 | 1.352 | 35 | 5 | 9.365 |

Cada ano tem cinco coordenadas de locais de votação extraídas do arquivo oficial daquele ano. As seções repetidas no arquivo de locais foram deduplicadas por zona/local, conferindo igualdade das coordenadas. Não foram reaproveitadas coordenadas de outro ano nem estimadas localizações. Os arquivos de origem são os recursos **Votação por seção eleitoral — PE** e **Eleitorado por local de votação**, nos conjuntos oficiais [2020 — resultados](https://dadosabertos.tse.jus.br/dataset/resultados-2020), [2024 — resultados](https://dadosabertos.tse.jus.br/dataset/resultados-2024), [2020 — locais](https://dadosabertos.tse.jus.br/dataset/eleitorado-2020) e [2024 — locais](https://dadosabertos.tse.jus.br/dataset/eleitorado-2024).

Todos os 2.541 registros persistidos e os dez pontos (cinco por ano) foram comparados campo a campo com os recortes preparados; os quatro lotes tiveram sua auditoria confirmada. O [manifesto da carga](data/xexeu-tse-importacao-2026-10-21.json) preserva URLs, hashes SHA-256 dos arquivos, datas de geração da fonte, totais conferidos e identificadores dos lotes. São dados agregados públicos; o manifesto não contém credenciais nem identificadores de usuários. Os totais não equivalem a votos válidos nem indicam situação de candidato eleito.

### Reproduzir a preparação

Com Python 3.11 ou superior, baixe os ZIPs oficiais indicados no manifesto e execute, para cada ano:

```powershell
python scripts/prepare-tse-xexeu.py --year 2024 --results-zip CAMINHO_VOTACAO_2024_PE.zip --places-zip CAMINHO_LOCAIS_2024.zip
```

O script lê o CSV dentro de cada ZIP sem extrair caminhos do arquivo, filtra PE/23060, confere nome e ano, preserva o cabeçalho de votação, normaliza somente identificadores e coordenadas dos locais e gera CSV, GeoJSON e manifesto em `.cloudflare-artifacts/tse-xexeu/` (ignorado pelo Git). Não lê variáveis de ambiente, não conecta ao banco e não envia dados automaticamente. Os arquivos preparados devem passar pela validação e autorização já existentes no formulário de importação.
