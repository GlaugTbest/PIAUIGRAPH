# Validação estadual — 29/10/2026

Carga `20261029T210005-state-34216cf0`, promovida apenas após coleta, consulta real ao Neo4j e verificação de integridade. A carga piloto anterior permanece no histórico.

## Cobertura comprovada

| Medida | Quantidade |
| --- | ---: |
| Municípios no mapa IBGE | 224 |
| Regiões imediatas IBGE | 19 |
| Registros de metadados examinados | 11.353 |
| Contratações candidatas de medicamentos | 278 |
| Procedimentos com itens identificados | 87 |
| Municípios com esses procedimentos | 56 |
| Procedimentos com resultado homologado elegível | 22 |
| Municípios com resultado elegível | 21 |
| Resultados elegíveis | 58 |
| Fornecedores por CNPJ completo | 23 |

Dos resultados, 11 são de 2024 e 47 de 2025. Especificações: 12 de ácido acetilsalicílico 100 mg, 25 de ácido fólico 5 mg, 11 de espironolactona 25 mg e 10 de ivermectina 6 mg. São contagens de resultados, não de contratos assinados ou pagamentos.

O filtro estadual percorreu as 24 janelas mensais de publicação, com paginação, para pregão eletrônico no Piauí. Selecionou objeto mencionando medicamento/farmácia e ano do procedimento 2024/2025. Apenas os quatro comprimidos padronizados entram na análise. A ausência de resultados não comprova ausência de compras.

A conferência conservadora excluiu uma apresentação cuja descrição informava caixa, em conflito com o campo de unidade. Não houve conversão presumida de embalagem. Respostas canceladas, datas fora do período, resultados ausentes e apresentações não comprovadas têm motivos de exclusão preservados. A carga final foi reprocessada a partir das respostas oficiais já capturadas; por isso seu contador de novas requisições é zero. Isso não representa ausência de coleta: os manifestos mantêm URLs, datas e hashes das capturas efetivas.

## Critérios de aceite

- Piloto de Pimenteiras, Gilbués e Milton Brandão aprovado antes da ampliação, com evidência histórica em `pilot-validation.md`.
- Identidades PNCP, municípios IBGE, CNPJ empresarial, datas, valores positivos, unicidade e referências à fonte conferidos.
- Neo4j Community 5.26.32: 416 nós e 457 relações. Importação, exportação, comparação exata com a entrada e travessia Cypher real passaram. O site serve a projeção verificada, não um banco ao vivo.
- Quatro grupos de produtos com referências reais. Próprio procedimento excluído, duplicatas dependentes limitadas, quantidade/data/diversidade e amostra mínima respeitadas.
- 11 testes de cálculo e integridade passaram. 12 testes de navegação passaram em Chromium desktop e Pixel 7 sobre a carga estadual.
- Busca municipal e global, regiões, paginação, ano, medicamento, indicador, detalhe, fonte, CSV, fornecedor, rede de um/dois saltos, estados vazios, recarga e histórico foram exercitados.
- Auditoria automatizada de acessibilidade sem violações WCAG A/AA nos estados testados. Não substitui avaliação humana de todas as combinações possíveis.
- Capturas de início, detalhe e rede em computador/celular sem erros de página ou rolagem horizontal. Revisão Impeccable: disposição de publicar.

## Desempenho observado e limites

Em produção local com a carga estadual, cinco consultas da visão estadual levaram 24, 6, 5, 5 e 5 ms. A mesma amostra para Pimenteiras levou 3, 3, 2, 2 e 3 ms. São medições locais, não garantias para a internet. A carga inicial de recursos do navegador ficou em aproximadamente 713 KB comprimidos na captura da visão estadual; a malha oficial simplificada tem 114.526 bytes sem compressão. A rede retorna no máximo 100 nós e 200 relações.

TCE-PI, BPS, PI Digital, sócios, sanções, contratos assinados e pagamentos não foram incorporados aos indicadores. As comparações não permitem concluir fraude, superfaturamento ou dano. A atualização mensal está configurada; execuções futuras dependem da disponibilidade das fontes e das cotas das plataformas.
