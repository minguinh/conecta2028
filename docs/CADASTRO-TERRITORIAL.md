# Cadastro territorial e mapa de Xexéu

## Uso

Entre com sua conta e abra **Mapa de Xexéu** no menu, ou `/territorio`. Administradores e coordenadores podem cadastrar e editar distritos, bairros, engenhos, sítios e comunidades rurais. Cada registro contém nome, descrição opcional, latitude/longitude opcionais e geometria opcional.

Use **Nova localidade**, escolha o tipo e preencha o formulário. As coordenadas podem ser digitadas ou selecionadas no mapa. Uma geometria pode ser colada como GeoJSON ou Feature GeoJSON. Formatos aceitos: Point, LineString, Polygon e MultiPolygon, em WGS84/EPSG:4326. Polígonos devem ter anéis fechados e topologia válida.

O registro usa a tabela existente `communities`, preservando suas referências em contatos, visitas, demandas e atividades. O campo `kind` distingue os cinco tipos. As contagens atuais do dashboard consideram os cadastros territoriais dessa tabela; nenhuma localidade de exemplo é inserida. A coluna `geom` é PostGIS, com SRID 4326 e índice GiST. Edições usam controle otimista de versão para evitar sobrescrita silenciosa.

## Mapa e fontes

MapLibre GL JS renderiza as camadas e exige WebGL2. A base padrão usa tiles raster OpenStreetMap no navegador, com atribuição visível, cache normal do navegador e sem download em massa ou prefetch offline. `NEXT_PUBLIC_MAP_STYLE_URL` permite substituir a base por um provedor próprio.

A referência municipal vem da API oficial do IBGE para o código `2616506`. O arquivo `public/geo/xexeu-ibge.geojson` preserva a resposta obtida; `public/geo/xexeu-source.json` registra URL, data de consulta e metadados oficiais. O centro inicial do mapa usa o centroide retornado pelo IBGE. A referência pode ser ocultada no controle de camadas.

Essa camada simplificada é adequada para visualização territorial; não representa limites de propriedades ou levantamento cadastral. Ela não cria registros em `communities` e não altera os indicadores. Nenhum ano de referência foi presumido: a fonte e a data da consulta ficam registradas.

Fontes: [município de Xexéu no IBGE](https://www.ibge.gov.br/cidades-e-estados/pe/xexeu.html), [API de malhas IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), [exemplo raster MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/), [política de tiles OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Importação de limites

**Importar limite municipal do IBGE** consulta um endpoint fixo para Xexéu; o servidor não busca URLs arbitrárias fornecidas pelo usuário. O retorno é conferido pelo código `2616506`, validado no PostGIS e armazenado em `territorial_boundaries`, com fonte verificada.

Também é possível importar arquivos `.geojson` ou `.json`, informando o órgão responsável e uma URL HTTPS opcional. Esses arquivos ficam marcados como **origem declarada pelo importador**, sem atribuição automática de autenticidade. A URL de origem é registrada, não consultada pelo servidor.

São aceitos FeatureCollection, Feature ou geometria Polygon/MultiPolygon. Limites: arquivo de até 2 MB, até 50 feições e até 20 mil vértices por geometria. Dados projetados precisam ser reprojetados para WGS84 e exportados em GeoJSON RFC 7946 antes do envio. Não há importação direta de Shapefile, GeoPackage ou TopoJSON nesta etapa.

A importação é transacional: se alguma geometria for inválida, o lote inteiro é recusado. O hash da geometria e o tipo da origem evitam duplicação ao repetir a mesma importação. Mudanças posteriores na geometria do fornecedor ficam como novo limite, preservando o anterior. As camadas importadas ficam separadas da referência visual do IBGE.

## Localizar atividades

Atividades existentes podem receber um ponto próprio, digitado ou escolhido no mapa. As atividades sem ponto permanecem sem marcador; não se usa a coordenada da comunidade como se fosse a posição exata da atividade.

O administrador e o coordenador podem localizar as atividades disponíveis. Assessores só consultam e localizam as atividades atribuídas a eles. Analistas consultam o território sem receber detalhes das atividades individuais. O cadastro completo de atividades segue na etapa específica do produto; este fluxo localiza os registros já existentes.

## Autorização e auditoria

`territory.manage` é exclusiva de administrador geral e coordenador. Assessores recebem apenas as localidades relacionadas aos registros sob sua responsabilidade. Analistas têm consulta das localidades e limites. O perfil futuro de saúde continua sem acesso.

Os endpoints revalidam sessão, papel e origem no servidor. As gravações revalidam o perfil dentro da transação. Coordenadas, tipos e geometrias são validados antes do INSERT/UPDATE, e o banco também possui constraints geográficas. Polígonos autointersectantes não são corrigidos silenciosamente: o usuário deve corrigir a geometria.

Os gatilhos de auditoria registram alterações de localidades, limites e posições de atividades, sem duplicar todo o conteúdo geográfico no log. Migrações `0005` e `0006` acrescentam o schema, validações e índices.

## Estados e limites

Sem localidades ou atividades, as listas mostram estados vazios. A referência municipal oficial continua disponível no mapa. Falhas de autenticação, banco, tiles ou WebGL2 são mostradas como indisponibilidade, sem dados fictícios. São carregadas até mil localidades, mil atividades e cem limites por consulta, com aviso quando houver truncamento.

Não há desenhos livres no mapa ou edição visual de vértices nesta etapa: a geometria entra pelo campo GeoJSON ou pela importação. O clique no mapa preenche as coordenadas. Não há remoção definitiva de localidades nesta interface, para preservar os vínculos existentes.

## Validação executada

Em 20/10/2026, dez testes unitários, typecheck e build de produção Next.js passaram. A integração foi exercitada em uma branch Neon isolada somente com o schema: cinco tipos de localidade, edição por coordenador, conflito de versão, coordenadas inválidas, polígono autointersectante, importação de arquivo e IBGE, prevenção de duplicação, controle de acesso, localização exclusiva do assessor e auditoria.

O mapa e o formulário foram conferidos no navegador. A verificação na branch `development` confirmou zero localidades, zero limites importados e zero atividades. A referência pública do IBGE é real, separada desses registros. A branch temporária e as credenciais de testes foram removidas após a execução. O deploy Cloudflare continua pendente da validação no ambiente Linux já documentada.
