import type { Dataset, Graph, GraphEdge, GraphNode } from "./model";

export function graphInput(data: Dataset): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const node = (n: GraphNode) => nodes.set(n.id, n);
  const edge = (
    source: string,
    target: string,
    type: string,
    evidence: string,
    capturedAt: string,
    procedureId?: string,
    year?: number,
  ) => {
    const id = `${source}|${type}|${target}|${year ?? "all"}`;
    if (!edges.has(id))
      edges.set(id, {
        id,
        source,
        target,
        type,
        evidence,
        capturedAt,
        ...(procedureId ? { procedureId } : {}),
        ...(year ? { year } : {}),
      });
  };
  const geoUrl =
    "https://servicodados.ibge.gov.br/api/v1/localidades/estados/22/municipios";
  for (const r of data.regions)
    node({
      id: `region:${r.id}`,
      type: "region",
      label: r.name,
      evidence: geoUrl,
    });
  for (const m of data.municipalities) {
    node({
      id: `municipality:${m.id}`,
      type: "municipality",
      label: m.name,
      municipalityId: m.id,
      evidence: geoUrl,
    });
    edge(
      `municipality:${m.id}`,
      `region:${m.regionId}`,
      "PERTENCE_A",
      geoUrl,
      data.manifest.collectedAt,
    );
  }
  for (const p of data.procedures) {
    const agency = `agency:${p.cnpj}:${p.unitCode}`;
    node({
      id: agency,
      type: "agency",
      label: p.unit,
      municipalityId: p.municipalityId,
      evidence: p.source.url,
    });
    node({
      id: `procedure:${p.id}`,
      type: "procedure",
      label: `${p.municipality} · ${p.sequence}/${p.year}`,
      municipalityId: p.municipalityId,
      year: p.year,
      evidence: p.officialUrl,
    });
    edge(
      agency,
      `municipality:${p.municipalityId}`,
      "UNIDADE_LOCALIZADA_EM",
      p.source.url,
      p.source.capturedAt,
    );
    edge(
      agency,
      `procedure:${p.id}`,
      "PUBLICA_PROCEDIMENTO",
      p.source.url,
      p.source.capturedAt,
      p.id,
      p.year,
    );
  }
  for (const o of data.observations) {
    node({
      id: `supplier:${o.supplierId}`,
      type: "supplier",
      label: o.supplier,
      evidence: o.source.url,
    });
    node({
      id: `product:${o.productId}`,
      type: "product",
      label: o.product,
      evidence: o.itemSource.url,
    });
    edge(
      `procedure:${o.procedureId}`,
      `supplier:${o.supplierId}`,
      "RESULTADO_PARA",
      o.source.url,
      o.source.capturedAt,
      o.procedureId,
      o.year,
    );
    edge(
      `procedure:${o.procedureId}`,
      `product:${o.productId}`,
      "CONTEM_ITEM_PADRONIZADO",
      o.itemSource.url,
      o.itemSource.capturedAt,
      o.procedureId,
      o.year,
    );
  }
  for (const c of data.contracts ?? []) {
    const agency = `agency:${c.agencyId}`;
    node({
      id: agency,
      type: "agency",
      label: c.agency,
      municipalityId: c.municipalityId,
      evidence: c.source.url,
    });
    node({
      id: `contract:${c.id}`,
      type: "contract",
      label: `${c.kind} · ${c.municipality} · ${c.year}`,
      municipalityId: c.municipalityId,
      year: c.year,
      evidence: c.officialUrl,
    });
    edge(
      agency,
      `municipality:${c.municipalityId}`,
      "UNIDADE_LOCALIZADA_EM",
      c.source.url,
      c.source.capturedAt,
    );
    edge(
      agency,
      `contract:${c.id}`,
      "PUBLICA_CONTRATO",
      c.source.url,
      c.source.capturedAt,
      c.procedureId ?? undefined,
      c.year,
    );
    if (c.procedureId)
      edge(
        `procedure:${c.procedureId}`,
        `contract:${c.id}`,
        "ORIGINA_CONTRATO",
        c.source.url,
        c.source.capturedAt,
        c.procedureId,
        c.year,
      );
    if (c.supplierId) {
      node({
        id: `supplier:${c.supplierId}`,
        type: "supplier",
        label: c.supplier,
        evidence: c.source.url,
      });
      edge(
        `contract:${c.id}`,
        `supplier:${c.supplierId}`,
        "CONTRATA_FORNECEDOR",
        c.source.url,
        c.source.capturedAt,
        c.procedureId ?? undefined,
        c.year,
      );
    }
  }
  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
    backend: "neo4j-snapshot",
    verified: false,
    version: data.manifest.version,
  };
}

export function neighborhood(
  graph: Graph,
  center: string,
  depth: number,
  year?: number,
) {
  if (!graph.nodes.some((n) => n.id === center))
    return { ...graph, nodes: [], edges: [], truncated: false };
  const eligible = graph.edges.filter(
    (e) => !year || !e.year || e.year === year,
  );
  const adjacency = new Map<string, GraphEdge[]>();
  for (const e of eligible)
    for (const id of [e.source, e.target]) {
      if (!adjacency.has(id)) adjacency.set(id, []);
      adjacency.get(id)!.push(e);
    }
  const ids = new Set([center]);
  const selected = new Map<string, GraphEdge>();
  let frontier = [center];
  let truncated = false;
  for (let i = 0; i < Math.max(1, Math.min(2, depth)); i++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const e of adjacency.get(id) ?? []) {
        const target = e.source === id ? e.target : e.source;
        if (selected.size >= 200 || (!ids.has(target) && ids.size >= 100)) {
          truncated = true;
          continue;
        }
        selected.set(e.id, e);
        if (!ids.has(target)) {
          ids.add(target);
          next.push(target);
        }
      }
    frontier = next;
  }
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => ids.has(n.id)),
    edges: [...selected.values()],
    truncated,
  };
}
