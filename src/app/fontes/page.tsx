import DocumentShell from "@/components/document-shell";
import { getData } from "@/lib/data";
import { ExternalLink } from "lucide-react";
export const metadata = { title: "Fontes e versão dos dados — PIAUIGRAPH" };
export default async function Sources() {
  const { data } = await getData();
  const m = data.manifest;
  return (
    <DocumentShell>
      <h1>Fontes abertas. Evidências à vista.</h1>
      <p className="document-intro">
        O PIAUIGRAPH é um projeto independente de portfólio. Não representa o
        IBGE, o PNCP ou qualquer órgão de controle.
      </p>
      <section className="source-card">
        <h2>Portal Nacional de Contratações Públicas</h2>
        <p>
          Fonte canônica de procedimentos, itens e resultados homologados desta
          carga. Cada ficha e cada relação no grafo apontam para o registro ou
          resposta de API correspondente. Dados fornecidos pelos órgãos
          publicadores podem conter erros ou omissões.
        </p>
        <dl>
          <dt>Recorte</dt>
          <dd>2024/2025 · Piauí · quatro especificações de comprimidos</dd>
          <dt>Chave</dt>
          <dd>
            CNPJ do órgão + ano + sequencial; item + sequencial de resultado
          </dd>
          <dt>Estágio</dt>
          <dd>Resultado homologado; não comprova pagamento</dd>
        </dl>
        <a
          href="https://pncp.gov.br/api/consulta/swagger-ui/index.html"
          target="_blank"
          rel="noreferrer"
        >
          API de consulta <ExternalLink size={13} />
        </a>
        <br />
        <a
          href="https://pncp.gov.br/manual/pt-br/2.5/contratacao/consultar_itens_de_uma_contratacao.html"
          target="_blank"
          rel="noreferrer"
        >
          Documentação de itens <ExternalLink size={13} />
        </a>
      </section>
      <section className="source-card">
        <h2>Instituto Brasileiro de Geografia e Estatística</h2>
        <p>
          Limites municipais e divisão em regiões geográficas imediatas. A malha
          está simplificada pela própria API do IBGE. Geografia e dados de
          compras usam chaves municipais oficiais.
        </p>
        <dl>
          <dt>Cobertura</dt>
          <dd>224 municípios · 19 regiões imediatas</dd>
          <dt>Chave</dt>
          <dd>Código IBGE municipal de sete dígitos</dd>
        </dl>
        <a
          href="https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios"
          target="_blank"
          rel="noreferrer"
        >
          Lista oficial de municípios <ExternalLink size={13} />
        </a>
      </section>
      <section className="source-card">
        <h2>Fontes investigadas, fora desta carga</h2>
        <p>
          TCE-PI, BPS e PI Digital foram avaliados na descoberta. Não são
          combinados aos totais ou comparações desta publicação. A reconciliação
          entre PNCP e TCE, a amostragem e as condições de reutilização do BPS
          ainda não foram validadas para inclusão. Nenhum vínculo entre esses
          conjuntos foi presumido.
        </p>
        <a
          href="https://www.tcepi.tc.br/portaldacidadania/dados-abertos"
          target="_blank"
          rel="noreferrer"
        >
          TCE-PI <ExternalLink size={13} />
        </a>
        <br />
        <a
          href="https://dadosabertos.saude.gov.br/dataset/bps"
          target="_blank"
          rel="noreferrer"
        >
          Banco de Preços em Saúde <ExternalLink size={13} />
        </a>
      </section>
      <h2>Manifesto da publicação</h2>
      <table>
        <tbody>
          {Object.entries({
            Versão: m.version,
            "Data de captura": m.collectedAt,
            Escopo: m.scopeDescription,
            "Procedimentos no recorte": m.procedures,
            "Resultados de itens": m.observations,
            Fornecedores: m.suppliers,
            "Municípios com procedimentos": m.municipalitiesWithData,
            "Municípios com resultados elegíveis": new Set(data.observations.map((o) => o.municipalityId)).size,
            "Procedimentos com resultados elegíveis": new Set(data.observations.map((o) => o.procedureId)).size,
            "Metadados consultados": m.metadataScanned,
            "Falhas na carga ativada": m.sourceFailures,
            "SHA-256 dos dados": m.datasetSha256,
            "Neo4j verificado": m.neo4j.verified
              ? `${m.neo4j.version} · ${m.neo4j.nodes} nós · ${m.neo4j.edges} relações`
              : "Não verificado",
          }).map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td style={{ overflowWrap: "anywhere" }}>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <a
          href="https://github.com/GlaugTbest/PIAUIGRAPH"
          target="_blank"
          rel="noreferrer"
        >
          Código, metodologia, parâmetros e reprodução no GitHub
        </a>
        .
      </p>
      <p>
        Informações factuais de transparência são apresentadas com atribuição à
        origem. Não se reivindica autoria dos registros oficiais. Documentos
        completos permanecem nas fontes; o site publica apenas os campos
        necessários à exploração. Dados pessoais desnecessários não devem
        integrar exportações.
      </p>
    </DocumentShell>
  );
}
