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

As contagens, versão, testes e medições finais serão registradas após preparar e testar a carga completa.
