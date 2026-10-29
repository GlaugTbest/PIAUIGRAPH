# Validação do piloto — 29/10/2026

Autorização de implementação e ampliação recebida em 29/10/2026. A ampliação estadual começou somente após estes resultados.

- Carga `20261029T160119-pilot-2c6f85c5`: Pimenteiras, Gilbués e Milton Brandão.
- 3 procedimentos, 10 resultados de itens, 4 fornecedores; 2 grupos comparáveis.
- Neo4j Community 5.26.32 executado em contêiner local: 257 nós e 244 relações, exportação conferida contra as entradas, consulta real de fornecedores executada.
- 10 testes de cálculo/integridade passaram.
- 8 testes de ponta a ponta passaram em Chromium desktop (1440 × 1000) e dispositivo móvel Pixel 7.
- Busca, seleção no mapa, lista de 224 municípios, filtros de ano/produto/indicador, procedimento, preço, fonte oficial, CSV, fornecedor, expansão da rede, link direto, recarga, histórico, metodologia e fontes verificados.
- Auditoria automatizada WCAG A/AA sem violações nos estados testados. Isso não substitui avaliação humana universal de acessibilidade.
- Mediana das cinco consultas locais de exploração: 4 ms em cada execução de desktop e móvel. Não é previsão de latência na internet.
- Malha municipal: 114.526 bytes sem compressão. Dataset piloto: 35.256 bytes. Exportação completa da rede: 114.771 bytes, servida ao navegador somente por vizinhanças limitadas.

Limitações preservadas: amostras pequenas não geram destaque; dados homologados não são pagamentos; cobertura parcial de medicamentos, sem integração BPS/TCE nos totais.

Falhas encontradas e corrigidas: configuração explícita do worker do MapLibre 6; altura do contêiner do mapa; semântica acessível do contêiner interativo. A repetição final passou após essas correções.
