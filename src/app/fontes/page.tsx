import DocumentShell from "@/components/document-shell";
import { getData } from "@/lib/data";
import { ExternalLink } from "lucide-react";
export const metadata = { title: "Fontes e cobertura — PIAUIGRAPH" };
export default async function Sources() {
  const { data } = await getData();
  const m = data.manifest;
  return (
    <DocumentShell>
      <h1>Informação que você pode conferir.</h1>
      <p className="document-intro">
        Cada compra, contrato e ligação aponta para a fonte pública. O
        PIAUIGRAPH é um projeto independente de portfólio.
      </p>
      <section className="source-card">
        <h2>Portal Nacional de Contratações Públicas</h2>
        <p>
          Fonte dos procedimentos de todas as áreas, resultados de itens e
          instrumentos publicados. Os órgãos e entidades são responsáveis pelo
          envio e pela qualidade do preenchimento. A existência de um registro
          não confirma execução ou pagamento.
        </p>
        <a
          href="https://pncp.gov.br/api/consulta/swagger-ui/index.html"
          target="_blank"
          rel="noreferrer"
        >
          API oficial de consulta <ExternalLink size={14} />
        </a>
        <br />
        <a
          href="https://pncp.gov.br/manual/pt-br/latest/"
          target="_blank"
          rel="noreferrer"
        >
          Manual de integração e campos do PNCP <ExternalLink size={14} />
        </a>
      </section>
      <section className="source-card">
        <h2>Instituto Brasileiro de Geografia e Estatística</h2>
        <p>
          Lista dos 224 municípios do Piauí, divisão em 19 regiões geográficas
          imediatas e malha municipal simplificada oficial. As compras são
          ligadas ao mapa pelo código municipal publicado.
        </p>
        <a
          href="https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios"
          target="_blank"
          rel="noreferrer"
        >
          Municípios na API do IBGE <ExternalLink size={14} />
        </a>
      </section>
      <h2>Manifesto da publicação</h2>
      <table>
        <tbody>
          {Object.entries({
            Versão: m.version,
            "Carga preparada em": m.collectedAt,
            Recorte: m.scopeDescription,
            "Compras catalogadas": m.procedures,
            "Municípios com compras": m.municipalitiesWithData,
            "Modalidades consultadas": m.modalities.join(", "),
            "Instrumentos publicados": data.contracts?.length ?? 0,
            "Meses conferidos no índice oficial de contratos": m.contractIndexCoverage?.length ?? 0,
            "Resultados de itens no subconjunto comparável": m.observations,
            "Municípios com esses resultados": new Set(
              data.observations.map((o) => o.municipalityId),
            ).size,
            "Empresas nos contratos e resultados": m.suppliers,
            "Registros de metadados examinados": m.metadataScanned,
            "Falhas na carga publicada": m.sourceFailures,
            "SHA-256 do conjunto": m.datasetSha256,
            "Neo4j verificado": m.neo4j.verified
              ? `${m.neo4j.version} · ${m.neo4j.nodes?.toLocaleString("pt-BR")} registros · ${m.neo4j.edges?.toLocaleString("pt-BR")} ligações`
              : "Verificação pendente",
          }).map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td style={{ overflowWrap: "anywhere" }}>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Como ler a cobertura</h2>
      <p>
        Os procedimentos vêm das publicações de 2024/2025 para unidades do
        Piauí, com ano do procedimento 2024/2025. Os contratos vêm do índice público
        de busca do portal PNCP, filtrado por Piauí, publicados no mesmo período e com ano do
        instrumento 2024/2025. Não é um inventário de todos os pagamentos, nem
        de documentos nunca enviados ao PNCP.
      </p>
      <p>
        Detalhes de itens consultados durante a navegação têm sua própria data e
        fonte na tela. Os preços unitários padronizados são um subconjunto
        verificado e não representam todos os itens do catálogo.
      </p>
      <p>
        TCE-PI, BPS, PI Digital, sócios e sanções ainda não foram incorporados a
        esta carga. Nenhum vínculo com essas bases foi presumido. O projeto usa
        somente os campos necessários para a exploração, com atribuição à
        origem.
      </p>
      <h2>Código, critérios e reprodução</h2>
      <p>
        <a
          href="https://github.com/GlaugTbest/PIAUIGRAPH"
          target="_blank"
          rel="noreferrer"
        >
          Abrir o repositório no GitHub <ExternalLink size={14} />
        </a>
      </p>
      <p>
        A documentação registra os critérios, os testes e o modo de reproduzir a
        preparação com Neo4j. Consultas e contratos não são somados entre si
        como despesa. Leituras de possíveis diferenças exigem conferência
        individual na documentação oficial.
      </p>
      <h2>Referências para a leitura crítica</h2>
      <p>
        <a
          href="https://www.gov.br/cgu/pt-br/assuntos/auditoria-e-fiscalizacao/alice"
          target="_blank"
          rel="noreferrer"
        >
          CGU · análise de licitações e riscos nas contratações{" "}
          <ExternalLink size={14} />
        </a>
        <br />
        <a
          href="https://sites.tcu.gov.br/listadealtorisco/governanca_das_contratacoes_publicas.html"
          target="_blank"
          rel="noreferrer"
        >
          TCU · governança das contratações públicas <ExternalLink size={14} />
        </a>
      </p>
      <p>
        Essas referências ajudam a contextualizar a fiscalização. Os destaques
        do PIAUIGRAPH seguem apenas as regras transparentes descritas em “Como
        ler os dados”.
      </p>
    </DocumentShell>
  );
}
