import DocumentShell from "@/components/document-shell";
import { getData } from "@/lib/data";
import Link from "next/link";
export const metadata = { title: "Como ler os dados — PIAUIGRAPH" };
export default async function Methodology() {
  const { data } = await getData();
  const m = data.manifest;
  return (
    <DocumentShell>
      <h1>Entenda o valor antes de tirar uma conclusão.</h1>
      <p className="document-intro">
        O PIAUIGRAPH organiza informações públicas para você encontrar uma
        compra, entender os números e conferir os documentos.
      </p>
      <h2>Três etapas, três significados</h2>
      <table>
        <thead>
          <tr>
            <th>Nome na tela</th>
            <th>O que significa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Valor estimado</th>
            <td>A previsão publicada pelo órgão para a compra ou serviço.</td>
          </tr>
          <tr>
            <th>Valor homologado</th>
            <td>
              O resultado aprovado e informado pelo órgão. Um registro de preços
              pode não ser comprado integralmente.
            </td>
          </tr>
          <tr>
            <th>Valor do contrato</th>
            <td>
              O valor de um instrumento publicado. Há contratos e outros tipos
              de instrumento; o tipo fica visível.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Essas etapas não comprovam entrega nem pagamento. O site não soma
        licitação, resultado e contrato como se fossem despesas diferentes: isso
        poderia contar o mesmo negócio várias vezes.
      </p>
      <h2 id="cobertura">Quais registros entram</h2>
      <p>{m.scopeDescription}</p>
      <p>
        A publicação contém {m.procedures.toLocaleString("pt-BR")} compras em{" "}
        {m.municipalitiesWithData} municípios. O mapa usa os 224 municípios e as
        19 regiões imediatas do IBGE. Um município aparecer no mapa não
        significa que todas as suas despesas estejam disponíveis aqui.
      </p>
      <p>
        O catálogo percorre as publicações do PNCP de janeiro de 2024 a dezembro
        de 2025, por modalidade e por página, para unidades compradoras do Piauí
        e procedimentos de 2024/2025. Não há filtro por assunto: obras,
        materiais e serviços podem aparecer. Os contratos vêm do índice público
        usado na busca do portal PNCP, filtrado por Piauí e mês de publicação;
        só entram instrumentos de 2024/2025 com código de município do Piauí.
        Cada um dos 24 meses exige captura de todas as páginas e contagem igual
        à informada pela fonte. O valor exibido é o global publicado; o índice
        não informa valor inicial nem comprova desembolso.
      </p>
      <p>
        Publicações fora desse intervalo, documentos que o órgão não enviou ao
        PNCP e despesas sem esses registros ficam de fora. Os itens são
        consultados na fonte oficial quando você abre a seção da compra. Essa
        consulta depende da disponibilidade do PNCP; a lista principal continua
        usando a carga verificada.
      </p>
      <h2>Como o site aponta valores para conferir</h2>
      <p>
        A regra principal compara dois totais do{" "}
        <strong>mesmo procedimento</strong>: estimado e homologado. Só usa
        valores positivos e situação “Normal” informada no PNCP. Destaca quando
        o homologado supera o estimado em mais de R$ 0,01, com diferença
        arredondada a centavos.
      </p>
      <p>
        O destaque mostra os dois números, a diferença em reais e a proporção.
        Ele não classifica uma pessoa ou uma área como fraudulenta. Mudanças de
        quantidade, retificações, alterações no objeto e erros de preenchimento
        precisam ser conferidos no processo. Valor alto, contratação direta e
        relação entre registros também não comprovam irregularidade
        isoladamente.
      </p>
      <p>
        Os assuntos são agrupamentos sugeridos pelas palavras do objeto, para
        facilitar a navegação. Não são classificação oficial nem ranking de
        risco. Uma mesma compra pode atender a mais de uma área; a busca
        preserva o texto original.
      </p>
      <h2>Quando preços unitários podem ser comparados</h2>
      <p>
        Comparar dois serviços pelo título ou duas embalagens diferentes pode
        produzir uma conclusão errada. Por isso a comparação unitária verificada
        tem um recorte explícito: comprimidos simples de ivermectina 6 mg,
        espironolactona 25 mg, ácido fólico 5 mg e ácido acetilsalicílico 100
        mg.
      </p>
      <p>
        Ela exige mesma substância, dosagem, unidade e ano do resultado, data a
        até 180 dias e quantidade entre metade e dobro. Exclui a própria compra
        e usa no máximo uma referência de cada procedimento. Associações,
        liberação modificada e apresentações ambíguas são excluídas. Menção
        explícita a caixa, cartela ou frasco impede assumir que se trata de um
        comprimido. Não há conversão presumida de embalagem.
      </p>
      <p>
        Um destaque unitário exige{" "}
        <strong>5 referências de 3 compradores e 2 fornecedores</strong>,
        mediana positiva e preço mais de 30% acima dela. Esse limite é uma regra
        exploratória do projeto, não uma norma legal ou uma probabilidade de
        fraude. Com menos dados, a tela informa amostra pequena e mantém apenas
        a comparação descritiva.
      </p>
      <p>
        Diferença material entre total, quantidade e preço impede destaque sobre
        o registro e seu uso como referência. A tolerância de arredondamento é
        quantidade × R$ 0,005 + R$ 0,01. As descrições e os valores originais
        continuam disponíveis.
      </p>
      <h2>De onde vêm as ligações</h2>
      <p>
        Órgão, compra, instrumento e fornecedor são conectados por
        identificadores publicados. Um contrato só é ligado a uma compra quando
        o PNCP fornece a chave exata. Empresa é identificada pelo CNPJ completo;
        matriz e filial permanecem distintas. CPF não é indexado. Sequências de
        documento pessoal inseridas nos nomes e textos são omitidas da publicação.
        Não são criadas ligações por nomes parecidos.
      </p>
      <p>
        O Neo4j recebe e verifica os registros antes da publicação. O site
        navega pela exportação dessa rede, com até dois passos, 100 registros e
        200 ligações por consulta. O desenho mostra até 28 registros para
        preservar a leitura; a lista oferece o conjunto retornado. Cada relação
        tem fonte. Não há inferência de sociedade, parentesco ou conluio.
      </p>
      <p>
        O município é o da unidade compradora. Não é uma suposição sobre a sede
        do fornecedor, o local da entrega ou quem foi beneficiado.
      </p>
      <h2>Como conferir uma informação</h2>
      <p>
        Abra o registro e use <strong>Abrir fonte oficial</strong>. Em “Conferir
        identificação e captura”, veja o identificador PNCP, a redação original,
        a data e o hash da resposta. O hash identifica os bytes capturados
        naquela consulta; a resposta atual da fonte pode mudar ou ser
        serializada em outra ordem.
      </p>
      <p>
        Campo ausente aparece como “Não informado”. Zero fornecido pela fonte é
        identificado como “Valor zerado na fonte”, sem tratá-lo como prova de
        compra gratuita. O texto pode ter a capitalização ajustada para leitura;
        a redação publicada permanece na identificação e nos arquivos exportados,
        com documentos pessoais omitidos.
      </p>
      <p>
        A atualização é mensal. Uma carga com falha de coleta, integridade,
        banco ou testes não substitui a anterior. A data de cada captura é
        preservada. O site não calcula superfaturamento, prejuízo ou dinheiro
        desviado.
      </p>
      <p>
        <Link href="/fontes">
          Ver o manifesto e as fontes desta publicação →
        </Link>
      </p>
    </DocumentShell>
  );
}
