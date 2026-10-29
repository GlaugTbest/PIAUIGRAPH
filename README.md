# PIAUIGRAPH

Encontre compras, obras, materiais e serviços públicos do Piauí, entenda os valores publicados e siga as ligações até a fonte oficial. Projeto pessoal de portfólio, público e não comercial.

[Abrir o site](https://piauigraph.vercel.app) · [Cobertura e validação geral](docs/catalog-validation.md) · [Publicação e orçamento](docs/deployment.md) · [Piloto histórico](docs/pilot-validation.md)

## Executar

Node.js 24 e npm. A carga publicada está incluída no repositório.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. Para produção local: `npm run build` e `npm start`.

## Encontrar e conferir

- Busca por texto, município, identificador PNCP, empresa ou CNPJ; filtros por assunto sugerido, ano, modalidade e região.
- Compras e instrumentos contratuais em listas separadas, paginadas; exportação CSV em blocos de até 1.000 registros.
- Mapa oficial dos 224 municípios e 19 regiões imediatas do IBGE. A cobertura permanece explícita.
- Previsão e resultado aprovado do mesmo procedimento, com duas barras na mesma escala. Um destaque exige situação normal, valores positivos e resultado superior à previsão em mais de um centavo.
- Contratos com valor global publicado, tipo, vigência e fornecedor. Contratação, previsão e homologação não são pagamentos e não são somadas entre si.
- Ligações entre município, órgão, compra, instrumento e empresa. CNPJ completo e chave PNCP exata; nenhuma ligação por nome parecido.
- Itens e resultados detalhados são consultados no PNCP ao abrir a seção. Falha mostra recuperação e link oficial; a busca principal permanece disponível.

## Fontes e limites

As publicações de procedimentos de 2024/2025 são percorridas por modalidade, período e página, para unidades do Piauí, sem filtro por assunto. O ano do procedimento também deve ser 2024/2025. O índice público de contratos do portal PNCP é consultado em 24 janelas mensais, filtrado por Piauí; todas as páginas devem fechar com o total informado. Só entram instrumentos de 2024/2025 com município válido do estado. Não é um inventário de pagamentos ou documentos ausentes do PNCP.

Cada registro tem URL, captura e SHA-256 dos bytes recebidos. O índice de contratos é a API pública usada pelo portal, sem versão de estabilidade; mudança de esquema interrompe a atualização. O valor inicial não está nesse índice e permanece ausente, sem ser inferido do global. Cancelamentos ficam identificados. Documentos pessoais nos textos são omitidos; brutos ficam em cache privado fora do Git.

A comparação unitária padronizada continua sendo um subconjunto explícito: comprimidos simples de ivermectina 6 mg, espironolactona 25 mg, ácido fólico 5 mg e ácido acetilsalicílico 100 mg. Não se compara automaticamente o preço de obras ou serviços pelo título. A metodologia pública descreve unidades, janela de 180 dias, quantidades, mediana, exclusão da própria compra e amostra mínima. TCE-PI, BPS, PI Digital, sócios e sanções não estão incorporados.

O site não calcula fraude, superfaturamento, prejuízo ou dinheiro desviado. Assuntos são sugestões baseadas no objeto, não classificação oficial ou ranking de risco.

## Neo4j e desempenho

O Neo4j Community real recebe a carga, executa consultas e exporta a rede. Contagens e propriedades são conferidas antes de promover a versão. A aplicação serve a exportação `neo4j-snapshot`, sem banco pago permanente ou credenciais no navegador. Retorna até dois passos, 100 registros e 200 ligações; o desenho limita a 28 registros e oferece a lista dos retornados.

Início e documentação são pré-renderizados. Catálogo e rede são carregados separadamente no servidor, com índice de busca em memória por versão. A interface recebe 20 registros por página. Mapa e rede são módulos sob demanda; o mapa oculto não carrega no celular. Fontes, malha e trabalhador do mapa são locais.

## Atualizar e verificar

Configure um Neo4j real conforme `.env.example`. Não publique credenciais.

```sh
npm run data:update -- --catalog
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

A preparação reúne o subconjunto comparável, catálogo geral e contratos; calcula integridade, valida no Neo4j e promove somente carga completa. O workflow mensal executa no dia 5 às 09:17 UTC, testa antes de commitar e publica pela integração Vercel. O cache só reutiliza capturas do mês corrente; meses seguintes exigem respostas novas. Coletas podem ser retomadas no mesmo mês. O pipeline geral usa essa regra; o coletor individual aceita `--refresh` para ignorar cache.

Falha de coleta, contagem, integridade, banco ou testes impede o commit. A publicação anterior continua disponível. Agendamento e disponibilidade do PNCP não são garantidos. Conservar os brutos é necessário para reprodução histórica byte a byte; a fonte atual pode mudar. Cache local em `.cache/official`, ignorado pelo Git, sujeito a revisão manual de tamanho e retenção; nenhum armazenamento pago foi criado.

Vercel Hobby e executores padrão do GitHub em repositório público atendem ao portfólio pessoal, dentro das cotas. Neo4j é local na preparação e efêmero no workflow. Não há plano pago ou promessa de disponibilidade ilimitada. Evidências históricas permanecem datadas e não descrevem a cobertura atual.
