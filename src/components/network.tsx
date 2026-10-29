"use client";
import { useMemo } from "react";
import type { Graph } from "@/lib/model";
const labels: Record<string, string> = {
  supplier: "Fornecedor",
  procedure: "Procedimento",
  agency: "Órgão/unidade",
  municipality: "Município",
  region: "Região",
  product: "Item padronizado",
};
export default function Network({
  graph,
  center,
  onCenter,
}: {
  graph: Graph;
  center: string;
  onCenter: (id: string) => void;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    map.set(center, { x: 300, y: 200 });
    const direct = new Set(
      graph.edges
        .filter((e) => e.source === center || e.target === center)
        .flatMap((e) => [e.source, e.target]),
    );
    direct.delete(center);
    const rings = [
      graph.nodes.filter((n) => n.id !== center && direct.has(n.id)),
      graph.nodes.filter((n) => n.id !== center && !direct.has(n.id)),
    ];
    rings.forEach((nodes, ring) =>
      nodes.forEach((n, i) => {
        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        map.set(n.id, {
          x: 300 + Math.cos(angle) * (ring ? 250 : 140),
          y: 200 + Math.sin(angle) * (ring ? 160 : 100),
        });
      }),
    );
    return map;
  }, [graph, center]);
  return (
    <>
      <div className="network-visual">
        <svg
          viewBox="0 0 600 400"
          role="img"
          aria-label={`Rede com ${graph.nodes.length} nós e ${graph.edges.length} relações documentadas`}
        >
          {graph.edges.map((e) => {
            const a = positions.get(e.source),
              b = positions.get(e.target);
            return a && b ? (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#c3a7ad"
                strokeWidth="1.2"
              />
            ) : null;
          })}
          {graph.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                <title>
                  {labels[n.type]}: {n.label}
                </title>
                {n.type === "procedure" ? (
                  <rect
                    x="-8"
                    y="-8"
                    width="16"
                    height="16"
                    rx="2"
                    fill="#732F3B"
                  />
                ) : (
                  <circle
                    r={n.id === center ? 14 : 8}
                    fill={
                      n.type === "supplier"
                        ? "#73030D"
                        : n.type === "product"
                          ? "#0D0D0D"
                          : "#a87d85"
                    }
                  />
                )}
                <text
                  y={n.id === center ? 31 : 23}
                  textAnchor="middle"
                  fill="#302126"
                  fontSize="11"
                >
                  {n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="muted small">
        Projeção verificada no Neo4j · {graph.nodes.length} nós ·{" "}
        {graph.edges.length} relações
        {graph.truncated ? " · rede limitada; há conexões não exibidas" : ""}.
      </p>
      <details>
        <summary>Ver nós e relações em tabela</summary>
        <ul className="node-list">
          {graph.nodes.map((n) => (
            <li key={n.id}>
              <span>{labels[n.type]}</span>
              <button onClick={() => onCenter(n.id)}>{n.label}</button>
            </li>
          ))}
        </ul>
      </details>
      <div className="edge-evidence">
        <h3>Evidências das relações</h3>
        {graph.edges.map((e) => (
          <a key={e.id} href={e.evidence} target="_blank" rel="noreferrer">
            <span>{e.type.toLowerCase().replaceAll("_", " ")}</span>
            <small>
              {graph.nodes.find((n) => n.id === e.source)?.label} →{" "}
              {graph.nodes.find((n) => n.id === e.target)?.label}
            </small>
          </a>
        ))}
      </div>
    </>
  );
}
