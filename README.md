# PIAUIGRAPH

Exploração de compras públicas do Piauí com mapa municipal, comparação de medicamentos e rede de relações verificadas. Projeto pessoal de portfólio, público e não comercial.

**Acessar:** https://piauigraph.vercel.app · [Validação estadual](docs/state-validation.md) · [Publicação e orçamento](docs/deployment.md)

## Executar

Node.js 24 e npm. Os dados publicados já estão incluídos; as APIs oficiais e o banco não são consultados no carregamento de páginas.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Produção local: `npm run build` e `npm start`.

## Dados e limites

- IBGE: 224 municípios e 19 regiões geográficas imediatas, malha simplificada oficial.
- PNCP: procedimentos, itens e resultados homologados, anos 2024/2025.
- Quatro especificações: ivermectina 6 mg, espironolactona 25 mg, ácido fólico 5 mg e ácido acetilsalicílico 100 mg, comprimidos simples.
- Ampliação estadual: paginação de pregões eletrônicos publicados em 2024/2025, ano do procedimento 2024/2025, unidade compradora no Piauí e objeto mencionando medicamento/farmácia.
- Cobertura parcial: não representa todas as modalidades ou todas as compras de todos os municípios. A ausência de registros é informada na interface.
- Carga inicial estadual de 29/10/2026: 87 procedimentos em 56 municípios. Desses, 22 procedimentos em 21 municípios têm 58 resultados elegíveis, de 23 fornecedores. Os demais procedimentos mantêm as limitações e exclusões visíveis.
- Preços são homologados, não pagamentos ou gastos efetivos. Totais de procedimentos não são somados aos itens.
- TCE-PI, BPS, PI Digital, sócios e sanções não integram os indicadores desta publicação.

O manifesto em `data/active.json` aponta para a carga imutável em `data/releases/`. Cada resposta usada possui URL, captura e SHA-256. Brutos/cache ficam fora do Git. Um erro de coleta interrompe a atualização sem alterar a versão ativa.

## Neo4j real e navegação rápida

O Neo4j é parte obrigatória da preparação da carga. O importador sanitiza dados oficiais, o banco recebe nós/relações por versão, consultas Cypher e travessias são executadas, e a projeção é exportada e conferida contra a entrada antes da publicação.

A aplicação pública serve essa projeção, não uma conexão ao vivo ao banco. Isso evita credenciais e consultas públicas arbitrárias, reduz a latência e permite operação sem banco pago permanente. O retorno informa `neo4j-snapshot`; o site explica esse funcionamento. A rede tem no máximo dois saltos, 100 nós e 200 relações por consulta. Não se desenham vínculos fictícios.

Em desenvolvimento foi usado Neo4j Community 5.26.32. Não foi contratado Aura nem aceito seu contrato. O workflow mensal usa um serviço Neo4j efêmero, sem banco público persistente. Community é GPLv3; o projeto não incorpora ou redistribui seu binário.

## Atualização

O workflow `Monthly official data` executa no dia 5 de cada mês, às 09:17 UTC (06:17 em Brasília), e também permite acionamento manual. Usa executores padrão em repositório público e um contêiner Neo4j efêmero. Nenhum serviço pago é requerido. A publicação Vercel depende de sua integração ao repositório e de suas cotas.

Para atualização local, inicie um Neo4j e configure `.env.local` conforme `.env.example` (nunca commitar senhas).

```sh
npm run data:pilot
npm run data:neo4j
npm run data:verify
npm run data:promote
```

Para o estado, use `npm run data:state -- --refresh`, e acrescente `-- --state` aos três comandos seguintes. Sem `--refresh`, o cache permite retomar uma coleta interrompida. O agendamento sempre solicita respostas novas; não confunde uma carga nova com dados antigos do cache.

As respostas brutas são mantidas localmente em `.cache/official`, fora do Git. Retenção proposta: 12 meses, revisão manual de tamanho até 3 GB; nenhum armazenamento externo pago é criado. O workflow tem cache limitado pelo GitHub. Uma reprodução histórica byte a byte exige conservar os brutos correspondentes, pois a fonte oficial pode mudar. Fontes, hashes, versões sanitizadas e relatórios ficam no repositório. Não apagar a carga anterior antes da conclusão de uma nova.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Testes determinísticos usam fixtures sintéticas isoladas. Testes de integridade e navegador usam a carga real publicada, sem depender de APIs oficiais ao vivo. Há verificações de mediana, exclusão do próprio procedimento, dependência entre resultados, diversidade, janela temporal, unidades, CSV, filtros, grafo e limites. A auditoria de acessibilidade e os testes de desktop/celular cobrem os fluxos principais.

O piloto foi aprovado por testes antes da coleta estadual; evidências em `docs/pilot-validation.md`. Resultados de desempenho locais não representam garantias de latência ou disponibilidade na internet.

## Metodologia

Regra `unit-price-v1`: mesmo produto, unidade e ano do resultado; até 180 dias; quantidade entre metade e dobro. Exclui o próprio procedimento e usa uma referência por procedimento. Destaque apenas com cinco referências de pelo menos três compradores e dois fornecedores, mediana positiva e preço mais de 30% acima da mediana. Limiar exploratório, não norma legal ou probabilidade de fraude. Sem amostra suficiente, mostra comparação descritiva e insuficiência.

Não há inferência de conluio, superfaturamento ou irregularidade. Dados ausentes não são zero. O município é o da unidade compradora, não um destino de entrega presumido. Identidade de fornecedor usa CNPJ completo; matriz e filial ficam distintas. Atribuição e fonte oficial são preservadas em cada evidência.

## Publicação

Vercel Hobby é o destino escolhido para o portfólio pessoal não comercial, sujeito às cotas do plano. O build usa a carga preparada e não provisiona banco. O site não tem login, escrita pública ou importação por URL arbitrária.

`next.config.ts` contém cabeçalhos de proteção e cache. Nenhuma credencial do banco é enviada ao navegador. Os exports têm campos públicos selecionados e proteção contra fórmulas de planilha. Uma implantação só deve ser descrita como produção após confirmar acesso anônimo e os fluxos na URL final.
