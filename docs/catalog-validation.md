# Validação do catálogo geral

Esta ampliação substitui a busca exclusiva de medicamentos. Os relatórios de piloto e estado anteriores são históricos.

## Critérios de aceite

- Percorrer todas as modalidades consultadas para publicações de 2024/2025 no Piauí, com ano do procedimento 2024/2025; guardar identidade, fonte e valores sem inventar campos ausentes.
- Consultar o índice de contratos em 24 meses; cada janela deve capturar exatamente a contagem informada, sem duplicações. Só incluir município válido do Piauí e instrumento de 2024/2025.
- Conferir amostra contra a API de contratos: identificador, valor global, CNPJ do fornecedor e chave da compra coincidentes.
- Validar importação/exportação no Neo4j real, integridade dos vínculos e hash de conteúdo; impedir promoção incompleta.
- Busca de assuntos não médicos, três municípios do piloto, filtros, paginação, contratos, empresas, mapa, ligações, fonte e CSV em desktop e celular.
- Falha e recuperação do PNCP sem travar a busca; teclado, acessibilidade automática e capturas sem transbordamento.
- Código e carga no GitHub, build Linux, abertura anônima e fluxos na URL pública.

## Fontes e amostra

Procedimentos: API oficial de consulta PNCP. Contratos: índice público usado em [Contratos do PNCP](https://pncp.gov.br/app/contratos), filtro PI e datas de publicação. Geografia: API oficial do IBGE.

O instrumento `33519114000100-2-000001/2024`, de acesso à internet para a Universidade Federal do Delta do Parnaíba, foi conferido entre o índice e [seu registro na API oficial](https://pncp.gov.br/api/pncp/v1/orgaos/33519114000100/contratos/2024/1). Coincidiram identificador, valor global de R$ 64.242,26, CNPJ do fornecedor e chave da contratação. Essa chave é de 2023, fora do catálogo; a interface oferece o link de origem sem inventar compra local correspondente.

O índice contém erros de origem, inclusive ano “20024”. Esse registro é contado nas respostas capturadas da janela e excluído do recorte publicado. Nenhuma correção presumida é aplicada.

## Limites

Não há prova de execução, pagamento, fraude ou sobrepreço calculado de obras/serviços. A regra geral compara estimativa e homologação do mesmo procedimento. Cancelamentos, retificações, quantidades e erros de preenchimento exigem conferir o processo. Preços unitários padronizados são apenas o subconjunto de quatro medicamentos documentado. Itens ao vivo dependem do PNCP. Não há comparação de objetos diferentes por título nem inferência de sócios ou sanções.

O índice pode mudar de esquema; a coleta interrompe em caso de contagem divergente, duplicação ou erro de origem. Brutos são privados. Carga sanitizada, fontes/hashes e verificação são versionadas.

## Resultado da publicação

Versão `20261030T001240-catalog-b5347462`, com a revisão de legibilidade da rede, preparada com capturas de 29/10/2026 e conferida novamente no Neo4j em 30/10/2026 00:12 UTC (29/10, 21:12 em Brasília). A primeira publicação geral, `20261029T233211-catalog-eb566d63`, permanece no histórico.

| Verificação | Resultado |
|---|---:|
| Procedimentos de todas as áreas | 25.770 |
| Municípios com procedimentos | 220 de 224 |
| Janelas modalidade/mês conferidas | 456 |
| Respostas de contratos nos 24 meses | 15.862 |
| Instrumentos incluídos no recorte | 15.589 |
| Municípios com instrumentos incluídos | 94 |
| Instrumentos ligados por chave exata a compra no catálogo | 13.575 |
| CNPJs nos instrumentos e resultados | 4.870 |
| Resultados unitários padronizados no subconjunto | 58 |
| Compras com previsão e homologação positivas e situação normal | 14.653 |
| Dessas, resultado acima da previsão em mais de R$ 0,01 | 122 |
| Registros exportados e conferidos no Neo4j 5.26.32 | 47.265 |
| Relações exportadas e conferidas | 70.404 |
| Testes de unidade e integridade da aplicação | 16 aprovados |
| Fluxos de navegador em desktop e celular | 14 aprovados |

As 273 respostas de instrumentos fora do ano/município válido permanecem fora da carga publicada. Ausência no catálogo não comprova ausência de contratação ou irregularidade.

Os testes de navegador usam registros reais dos três municípios do piloto, busca de pavimentação, serviços e combustíveis, instrumentos/empresas, fonte, CSV, gráfico, mapa/lista, filtros, paginação, link direto, recarga e recuperação de erro. A recuperação de itens usa uma resposta real previamente capturada, isolada como fixture; nenhum dado sintético vai à produção. Axe verifica critérios WCAG A/AA nos estados inicial e de detalhe; isso não substitui uma avaliação humana completa.

As dez capturas locais (desktop 1440×1000, celular 390×844 e estados de detalhe, instrumentos, mapa, análise e ligações) não registraram erro de JavaScript nem transbordamento horizontal. O carregamento observado no laboratório local variou por estado; não é garantia de velocidade na internet. Na abertura móvel, mapa oculto não é baixado.

Consultas reais de itens na API oficial retornaram HTTP 200 para pavimentação (`09034960000147-1-000072/2025`, 1 item), serviços (`10806496000149-1-000171/2025`, 1 item) e combustíveis (`01612565000192-1-000030/2025`, 3 itens), conferidas em 30/10/2026 00:10 UTC. Na busca do catálogo, os termos retornaram respectivamente 1.086, 8.912 e 417 procedimentos; contagens são deste conjunto, não estimativas estaduais de despesa.

Medição local reproduzível por `node scripts/measure-catalog.mjs`: seis GETs sequenciais por endpoint, cinco após a primeira para a mediana, sem limitação artificial de rede. Medianas observadas: catálogo geral 51 ms, busca de serviços 37 ms, instrumentos 15 ms, vizinhança de fornecedor 21 ms. Respostas entre 32 e 44 KB, com limites de paginação/rede. A primeira requisição não necessariamente corresponde a uma função fria.
