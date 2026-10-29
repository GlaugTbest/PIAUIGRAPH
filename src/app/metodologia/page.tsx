import DocumentShell from "@/components/document-shell";
import { getData } from "@/lib/data";
export const dynamic = "force-dynamic";
export const metadata = { title: "Metodologia e cobertura — PIAUIGRAPH" };
export default async function Methodology() {
  const { data } = await getData();
  const m = data.manifest;
  return (
    <DocumentShell>
      <h1>O que os dados permitem afirmar.</h1>
      <p className="document-intro">
        Uma comparação só é útil quando sabemos o que está sendo comparado, de
        onde veio a informação e o que ficou de fora.
      </p>
      <div className="document-meta">
        <span>Regra: unit-price-v1</span>
        <span>Carga: {m.version}</span>
        <span>
          Captura:{" "}
          {new Date(m.collectedAt).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
        </span>
      </div>
      <h2 id="cobertura">Cobertura territorial e analítica</h2>
      <p>
        O mapa contém os 224 municípios do Piauí e as 19 regiões geográficas
        imediatas do IBGE. As regiões são agrupamentos oficiais de municípios;
        não são territórios administrativos de saúde. A malha é consultada na
        API do IBGE e versionada junto à carga.
      </p>
      <p>
        <strong>Recorte efetivamente coletado:</strong> {m.scopeDescription}
      </p>
      <p>
        Esta versão contém {m.procedures.toLocaleString("pt-BR")} procedimentos
        com itens identificados, em {m.municipalitiesWithData} municípios.
        Desses, {new Set(data.observations.map((o) => o.procedureId)).size}
        {" "}procedimentos em {new Set(data.observations.map((o) => o.municipalityId)).size}
        {" "}municípios possuem os {m.observations.toLocaleString("pt-BR")}
        {" "}resultados homologados elegíveis. A existência de um município no
        mapa não significa que todas as suas compras tenham sido analisadas.
      </p>
      <p>
        A coleta estadual percorre as páginas de publicações de pregão
        eletrônico (modalidade 6) entre janeiro de 2024 e dezembro de 2025.
        Seleciona objetos que mencionam medicamento ou farmácia e procedimentos
        cujo ano é 2024 ou 2025. Esse filtro pode deixar de fora compras de
        medicamentos descritas de outra forma. Não cobre todas as modalidades,
        publicações posteriores ou a totalidade dos contratos do estado.
      </p>
      <p>
        O território é o da unidade compradora informada pelo PNCP. Para órgãos
        federais ou estaduais, não se presume benefício municipal nem
        distribuição territorial da compra. A sede do fornecedor não é inferida.
      </p>
      <h2>Valores e estágios</h2>
      <p>
        O indicador financeiro principal soma somente{" "}
        <strong>
          totais homologados dos resultados dos itens selecionados
        </strong>
        . Um resultado homologado, inclusive de registro de preços, não comprova
        contrato assinado, entrega, empenho ou pagamento. Os valores estimado e
        homologado do procedimento completo aparecem separadamente na ficha e
        podem conter itens fora deste recorte.
      </p>
      <p>
        Valores ausentes são desconhecidos. Nenhum valor de procedimento é
        somado ao total de seus itens. Não é apresentado indicador de
        concentração por valor contratado porque essa carga não comprova o
        universo de contratos assinados e sua execução.
      </p>
      <h2 id="comparacao">Comparação de preço unitário</h2>
      <p>
        São padronizados comprimidos simples de ivermectina 6 mg,
        espironolactona 25 mg, ácido fólico 5 mg e ácido acetilsalicílico 100
        mg. A identificação exige substância, dosagem e unidade de comprimido
        explicitamente publicadas. Apresentações ambíguas, associações,
        liberação modificada e embalagens sem unidade comprovada são excluídas.
        Menções explícitas a caixa, cartela ou frasco também são excluídas,
        mesmo quando o campo de unidade diz comprimido, para não resolver uma
        apresentação contraditória por suposição. Não há conversão de embalagens.
        A descrição original fica disponível; similaridade textual sozinha não
        cria uma equivalência.
      </p>
      <p>
        O preço usado é o valor unitário homologado publicado no resultado. Cada
        referência deve ter a mesma especificação e ano do resultado, data a até
        180 dias da observação e quantidade entre metade e dobro da quantidade
        observada. O próprio procedimento e suas duplicatas são excluídos;
        usa-se no máximo uma referência de cada procedimento, em ordem estável
        de identificador.
      </p>
      <p>
        O universo de referência pode incluir outros municípios do estado
        presentes na mesma carga. A seleção de um município escolhe as
        observações analisadas, sem restringir silenciosamente esse universo.
        Referências, datas, quantidades e fornecedores são expostos na ficha.
      </p>
      <p>
        <code>
          diferença (%) = (preço observado / mediana da referência − 1) × 100
        </code>
      </p>
      <p>
        A mediana descritiva pode ser exibida em amostras pequenas, acompanhada
        do tamanho da amostra. Um destaque por diferença de preço requer ao
        menos <strong>5 referências de 3 compradores e 2 fornecedores</strong>,
        mediana positiva e diferença superior a <strong>30%</strong>. O
        comprador é identificado pelo CNPJ do órgão e código da unidade
        compradora. Esses parâmetros são uma convenção exploratória versionada,
        não uma norma legal ou medida da probabilidade de fraude.
      </p>
      <p>
        Abaixo dos mínimos, o estado é “dados insuficientes para alerta”. Não se
        ampliam janela ou faixa de quantidade para produzir um destaque. Não há
        ajuste por inflação, marca ou condições de entrega não documentadas; uma
        diferença observada exige investigação adicional. O sistema não calcula
        superfaturamento, prejuízo ou dinheiro desviado.
      </p>
      <p>
        Quando o total diverge de quantidade × preço unitário, a ficha preserva
        os valores oficiais. Diferenças compatíveis com arredondamento do preço
        a centavos são sinalizadas. Divergências superiores à tolerância de
        quantidade × R$ 0,005 + R$ 0,01 excluem o resultado da referência e
        impedem um destaque sobre esse próprio registro até conferência.
      </p>
      <h2>Fornecedores e grafo</h2>
      <p>
        A identidade de fornecedores usa o CNPJ completo. Matriz e filial
        permanecem distintas. Nomes semelhantes não fundem empresas. A rede
        registra relações entre região, município, unidade compradora,
        procedimento, item padronizado e fornecedor do resultado, com URL
        oficial por relação.
      </p>
      <p>
        O Neo4j recebe a carga real e executa consultas Cypher, validações e
        travessias. O site consulta uma projeção dessa versão exportada do banco
        e conferida antes da ativação.{" "}
        <strong>
          Esta publicação não afirma manter uma conexão ao vivo com o banco.
        </strong>{" "}
        A projeção permite navegação rápida mesmo quando a coleta ou o banco
        estão indisponíveis. A rede pública limita a expansão a dois saltos, 100
        nós e 200 relações, e informa quando há truncamento.
      </p>
      <p>
        Compartilhar um órgão contratante não demonstra conluio ou participação
        conjunta em licitação. Dados sobre sócios e pessoas físicas não integram
        o escopo.
      </p>
      <h2>Atualização e reprodução</h2>
      <p>
        A atualização prevista é mensal. O importador utiliza paginação,
        concorrência limitada, retomada por cache e tentativas com espera. Cada
        resposta utilizada possui endereço, data de captura e SHA-256. Uma nova
        carga só é ativada após validação de identidade, cobertura, cálculos e
        exportação do Neo4j. Falhas preservam a última carga válida.
      </p>
      <p>
        O build usa dados já preparados e não depende das APIs oficiais. O
        repositório inclui as projeções sanitizadas, parâmetros e verificações.
        Respostas brutas e documentos utilizados na conferência ficam fora do
        Git; sua disponibilidade posterior na fonte não é garantida.
      </p>
      <p>
        Uma comparação sem destaque não comprova regularidade. Ausência de
        registros pode significar falta de cobertura, filtro ou insuficiência
        cadastral.
      </p>
    </DocumentShell>
  );
}
