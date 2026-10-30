# Publicação e orçamento

Verificado em 29/10/2026.

- Site público: https://piauigraph.vercel.app
- Repositório público: https://github.com/GlaugTbest/PIAUIGRAPH
- Projeto Vercel: `glaugtbests-projects/piauigraph`, plano Hobby. Funções em São Paulo (`gru1`), Node.js 24.
- Publicação automática ligada à branch `main`. Dados preparados entram no build; a página não depende da disponibilidade momentânea do PNCP ou de um banco ligado permanentemente.
- Início, Fontes e Metodologia são pré-renderizados no build e distribuídos como páginas estáticas. Filtros e links diretos são lidos no navegador; as consultas de dados continuam nas APIs com cache. Isso evita inicializar uma função apenas para abrir a página.
- As funções recebem apenas a carga ativa. Cargas históricas permanecem no GitHub, mas são excluídas dos pacotes da hospedagem para evitar crescimento desnecessário a cada atualização. A presença da carga ativa foi conferida nos manifestos de empacotamento das APIs de catálogo, registro e rede.

## Compatibilidade com R$ 0/mês

O usuário esclareceu que se trata de portfólio pessoal, sem finalidade comercial, divulgado no LinkedIn/TikTok. Esse cenário foi enquadrado no [Vercel Hobby](https://vercel.com/docs/plans/hobby), destinado a uso pessoal e não comercial. Nenhum plano pago, domínio pago ou adicional foi contratado. O plano tem cotas; excedê-las pode interromper recursos até a renovação da franquia. Não se promete disponibilidade ilimitada.

Os workflows usam executores padrão do GitHub em repositório público, categoria [gratuita segundo a documentação oficial](https://docs.github.com/en/actions/concepts/billing-and-usage). Não usam executores maiores pagos. Cache e artefatos continuam sujeitos aos limites da plataforma.

O banco empregado é Neo4j Community, local na validação inicial e efêmero no workflow mensal. A [licença publicada pela Neo4j](https://neo4j.com/legal-terms/) aponta para GPLv3. O site recebe apenas a exportação conferida. Não foi criado banco Aura, ativado teste pago ou contratado hospedagem de banco.

## Operação

Atualização mensal no dia 5, às 06:17 de Brasília. Falha de coleta, validação, teste ou build impede a publicação da nova carga. A versão anterior continua ativa. A plataforma pode atrasar agendamentos; a data efetiva da captura fica disponível em Fontes.

Os arquivos de credenciais e as respostas de trabalho estão ignorados pelo Git e pela implantação. Uma atualização das dependências deve preservar no lockfile os pacotes opcionais de outras plataformas; a instalação limpa no Linux é conferida pelo workflow.
