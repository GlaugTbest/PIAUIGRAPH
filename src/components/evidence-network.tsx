"use client";
import { useMemo } from "react";
import {
  Building2,
  FileText,
  MapPin,
  Package,
  UserRound,
  ArrowUpRight,
} from "lucide-react";
import type { Graph, GraphNode } from "@/lib/model";
const labels: Record<GraphNode["type"], string> = {
  supplier: "Fornecedor",
  procedure: "Compra",
  agency: "Órgão comprador",
  municipality: "Município",
  region: "Região",
  product: "Item comparável",
  contract: "Contrato / instrumento",
};
const column: Record<GraphNode["type"], number> = {
  region: 0,
  municipality: 0,
  agency: 1,
  procedure: 2,
  contract: 3,
  product: 3,
  supplier: 4,
};
const verbs: Record<string, string> = {
  PERTENCE_A: "Faz parte da região",
  UNIDADE_LOCALIZADA_EM: "Unidade compradora localizada em",
  PUBLICA_PROCEDIMENTO: "Órgão publicou a compra",
  RESULTADO_PARA: "Resultado publicado para o fornecedor",
  CONTEM_ITEM_PADRONIZADO: "Compra contém o item comparável",
  PUBLICA_CONTRATO: "Órgão publicou o instrumento",
  ORIGINA_CONTRATO: "Compra deu origem ao instrumento",
  CONTRATA_FORNECEDOR: "Instrumento informa o fornecedor",
};
function NodeIcon({ type }: { type: GraphNode["type"] }) {
  return type === "supplier" ? (
    <UserRound size={17} />
  ) : type === "municipality" || type === "region" ? (
    <MapPin size={17} />
  ) : type === "agency" ? (
    <Building2 size={17} />
  ) : type === "product" ? (
    <Package size={17} />
  ) : (
    <FileText size={17} />
  );
}
export default function EvidenceNetwork({
  graph,
  center,
  onCenter,
}: {
  graph: Graph;
  center: string;
  onCenter: (id: string) => void;
}) {
  const layout = useMemo(() => {
    const direct = new Set(
      graph.edges
        .filter((e) => e.source === center || e.target === center)
        .flatMap((e) => [e.source, e.target]),
    );
    const nodes = graph.nodes
      .toSorted(
        (a, b) =>
          Number(b.id === center) - Number(a.id === center) ||
          Number(direct.has(b.id)) - Number(direct.has(a.id)) ||
          a.label.localeCompare(b.label),
      )
      .slice(0, 28);
    const groups = Map.groupBy(nodes, (n) => column[n.type]);
    const height = Math.max(
      310,
      ...[...groups.values()].map((g) => g.length * 94 + 55),
    );
    const positions = new Map<string, { x: number; y: number }>();
    for (const [col, rows] of groups)
      rows.forEach((n, i) =>
        positions.set(n.id, {
          x: 100 + col * 208,
          y: 55 + ((i + 0.5) * (height - 65)) / rows.length,
        }),
      );
    return { nodes, positions, height, width: 1035 };
  }, [graph, center]);
  const names = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n.label])),
    [graph.nodes],
  );
  if (!graph.nodes.length)
    return (
      <div className="empty-state">
        <h3>Sem ligações nesta publicação.</h3>
        <p>
          O registro pode existir na fonte sem fazer parte da rede verificada
          desta carga.
        </p>
      </div>
    );
  return (
    <>
      <div
        className="network-visual"
        role="region"
        aria-label="Diagrama de ligações documentadas"
      >
        <div
          className="network-canvas"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg width={layout.width} height={layout.height} aria-hidden="true">
            {graph.edges.map((e) => {
              const a = layout.positions.get(e.source),
                b = layout.positions.get(e.target);
              return a && b ? (
                <path
                  key={e.id}
                  d={`M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`}
                  fill="none"
                  stroke="#8caeaa"
                  strokeWidth={
                    e.source === center || e.target === center ? 2 : 1.2
                  }
                />
              ) : null;
            })}
          </svg>
          {layout.nodes.map((n) => {
            const p = layout.positions.get(n.id)!;
            return (
              <button
                key={n.id}
                className={`network-node ${n.id === center ? "is-center" : ""}`}
                style={{ left: p.x, top: p.y }}
                onClick={() => onCenter(n.id)}
                title={`${labels[n.type]}: ${n.label}`}
                aria-label={`Seguir ligações de ${labels[n.type]}: ${n.label}`}
              >
                <NodeIcon type={n.type} />
                <span>
                  <small>{labels[n.type]}</small>
                  <strong>{n.label}</strong>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="network-help">
        As linhas mostram apenas relações publicadas. Uma ligação não é
        evidência de irregularidade. No celular, arraste a área do diagrama ou
        use a lista abaixo.
      </p>
      <p className="network-caption">
        Rede preparada e verificada no Neo4j. {graph.nodes.length} registros e{" "}
        {graph.edges.length} ligações neste recorte.
        {layout.nodes.length < graph.nodes.length
          ? ` O desenho mostra ${layout.nodes.length}; a lista contém todos os registros retornados.`
          : ""}
        {graph.truncated
          ? " Há mais ligações: siga um registro para explorar sem sobrecarregar a tela."
          : ""}
      </p>
      <details>
        <summary>Ver os registros em lista</summary>
        <ul className="node-list">
          {graph.nodes.map((n) => (
            <li key={n.id}>
              <span>{labels[n.type]}</span>
              <button onClick={() => onCenter(n.id)}>{n.label}</button>
            </li>
          ))}
        </ul>
      </details>
      <details className="edge-evidence">
        <summary>Conferir a fonte de cada ligação</summary>
        {graph.edges.map((e) => (
          <a key={e.id} href={e.evidence} target="_blank" rel="noreferrer">
            <span>
              {verbs[e.type] ?? "Relação publicada"}
              <ArrowUpRight size={13} />
            </span>
            <small>
              {names.get(e.source)} → {names.get(e.target)}
            </small>
          </a>
        ))}
      </details>
    </>
  );
}
