"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Info,
  Layers,
  MapPin,
  Network as NetworkIcon,
  Search,
  X,
} from "lucide-react";
import type {
  Dataset,
  Graph,
  Manifest,
  Municipality,
  Observation,
  Procedure,
  Region,
} from "@/lib/model";
import type { compare } from "@/lib/analysis";
import type { explore, summarize } from "@/lib/data";

const MunicipalMap = dynamic(() => import("./municipal-map"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparando o mapa…</div>,
});
const Network = dynamic(() => import("./network"), {
  loading: () => <p>Preparando a rede…</p>,
});
type Exploration = ReturnType<typeof explore>;
type Comparison = ReturnType<typeof compare>;
type Detail = {
  procedure: Procedure;
  observations: Comparison[];
  exclusions: Dataset["exclusions"];
  version: string;
};
type Supplier = {
  id: string;
  name: string;
  summary: ReturnType<typeof summarize>;
  procedures: Procedure[];
  evolution: ({ year: number } & ReturnType<typeof summarize>)[];
  observations: Observation[];
};
const products = [
  ["ivermectina-6mg", "Ivermectina 6 mg"],
  ["espironolactona-25mg", "Espironolactona 25 mg"],
  ["acido-folico-5mg", "Ácido fólico 5 mg"],
  ["aas-100mg", "Ácido acetilsalicílico 100 mg"],
];
const currency = (n: number | null) =>
  n === null
    ? "Não informado"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (n: number) => n.toLocaleString("pt-BR");
const date = (s: string) =>
  new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("pt-BR");
const cnpj = (s: string) =>
  s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function useResource<T>(url: string | null) {
  const [value, setValue] = useState<{
    url: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    if (!url) return;
    const abort = new AbortController();
    void fetch(url, { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok)
          throw new Error(
            (await r.json()).error ?? "Não foi possível consultar esta carga.",
          );
        return r.json();
      })
      .then((data) => setValue({ url, data }))
      .catch((e) => {
        if (!abort.signal.aborted) setValue({ url, error: e.message });
      });
    return () => abort.abort();
  }, [url]);
  return {
    data: value?.url === url ? value.data : undefined,
    error: value?.url === url ? value.error : undefined,
    loading: !!url && value?.url !== url,
  };
}

export default function Explorer({
  bootstrap,
  initialQuery,
}: {
  bootstrap: {
    municipalities: Municipality[];
    regions: Region[];
    manifest: Manifest;
  };
  initialQuery: string;
}) {
  const query = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => initialQuery,
  );
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const m = params.get("m") ?? "",
    r = params.get("r") ?? "",
    y = params.get("y") ?? "",
    p = params.get("p") ?? "",
    indicator = params.get("i") ?? "";
  const caseId = params.get("case") ?? "",
    supplierId = params.get("supplier") ?? "",
    tab = params.get("tab") ?? "purchases";
  const selected = bootstrap.municipalities.find((t) => t.id === m);
  const region = bootstrap.regions.find((t) => t.id === r);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const depth = params.get("depth") === "2" ? 2 : 1;
  const customCenter = params.get("center") ?? "";
  function update(changes: Record<string, string | null>, reset = false) {
    const next = new URLSearchParams(window.location.search);
    if (reset) {
      ["case", "supplier", "center", "depth", "page"].forEach((k) =>
        next.delete(k),
      );
    }
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (
      next.get("tab") === "network" &&
      !["m", "case", "supplier", "center"].some((k) => next.get(k))
    )
      next.set("tab", "purchases");
    window.history.pushState(null, "", next.size ? `/?${next}` : "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(timer);
  }, [search]);
  const globalSearch = useResource<{
    suppliers: { id: string; name: string }[];
    procedures: { id: string; name: string }[];
  }>(
    debouncedSearch.length >= 2
      ? `/api/search?q=${encodeURIComponent(debouncedSearch)}`
      : null,
  );
  const onMunicipality = (id: string) => {
    update({ m: id, r: null }, true);
    setSearch("");
    setCollapsed(false);
  };
  const browseQuery = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of ["m", "r", "y", "p", "i", "q", "page"])
      if (params.has(k)) q.set(k, params.get(k)!);
    return q.toString();
  }, [params]);
  const exploration = useResource<Exploration>(`/api/explore?${browseQuery}`);
  const detail = useResource<Detail>(
    caseId ? `/api/detail?id=${encodeURIComponent(caseId)}` : null,
  );
  const supplier = useResource<Supplier>(
    supplierId ? `/api/supplier?id=${supplierId}&y=${y}` : null,
  );
  const center =
    customCenter ||
    (supplierId
      ? `supplier:${supplierId}`
      : caseId
        ? `procedure:${caseId}`
        : m
          ? `municipality:${m}`
          : "");
  const graph = useResource<Graph>(
    tab === "network" && center
      ? `/api/graph?center=${encodeURIComponent(center)}&depth=${depth}&y=${y}`
      : null,
  );
  const regionIds = useMemo(
    () =>
      r
        ? bootstrap.municipalities
            .filter((t) => t.regionId === r)
            .map((t) => t.id)
        : [],
    [r, bootstrap.municipalities],
  );
  const suggestions = useMemo(
    () =>
      search
        ? bootstrap.municipalities
            .filter((t) => normalize(t.name).includes(normalize(search)))
            .slice(0, 7)
        : [],
    [search, bootstrap.municipalities],
  );
  const title = selected?.name ?? region?.name ?? "Piauí";
  const shown = exploration.data;
  function chooseCase(id: string) {
    update({
      case: id,
      supplier: null,
      center: null,
      depth: null,
      tab: "purchases",
    });
    setSearch("");
    setCollapsed(false);
  }
  useEffect(() => {
    if (detail.data) {
      const heading = document.querySelector<HTMLElement>(".detail-title h2");
      heading?.focus({ preventScroll: true });
      document
        .querySelector(".detail-section")
        ?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
    }
  }, [detail.data]);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#results">
        Ir para os resultados
      </a>
      <header className="masthead">
        <Link
          href="/"
          className="brand"
          aria-label="PIAUIGRAPH, voltar ao estado"
        >
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <path
              d="M9 8 27 16 13 29 9 8M9 8l4 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="9" cy="8" r="4" fill="currentColor" />
            <circle cx="27" cy="16" r="4" fill="currentColor" />
            <circle cx="13" cy="29" r="4" fill="currentColor" />
          </svg>
          <span>
            PIAUI<span className="brand-light">GRAPH</span>
          </span>
        </Link>
        <span className="brand-description">Contratações em perspectiva.</span>
        <nav aria-label="Navegação principal">
          <span className="nav-active">Explorar</span>
          <Link href="/metodologia">Metodologia</Link>
          <Link href="/fontes">
            Fontes <ArrowUpRight size={13} />
          </Link>
        </nav>
        <span className="public-tag">
          <i />
          Dados públicos
        </span>
      </header>
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={19} />
          <input
            aria-label="Buscar município"
            placeholder="Município, fornecedor ou contratação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length)
                onMunicipality(suggestions[0].id);
              if (e.key === "Escape") setSearch("");
            }}
            autoComplete="off"
          />
          {search && (
            <button aria-label="Limpar busca" onClick={() => setSearch("")}>
              <X size={16} />
            </button>
          )}
          {search && (
            <div className="search-results" aria-label="Resultados de busca">
              {suggestions.length > 0 && (
                <>
                  <span className="search-group">Municípios</span>
                  {suggestions.map((t) => (
                    <button key={t.id} onClick={() => onMunicipality(t.id)}>
                      <MapPin size={15} />
                      <span>
                        {t.name}
                        <small>{t.region}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </>
              )}
              {globalSearch.data?.suppliers.length ? (
                <>
                  <span className="search-group">Fornecedores</span>
                  {globalSearch.data.suppliers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        update({
                          supplier: s.id,
                          case: null,
                          m: null,
                          r: null,
                          tab: "network",
                          center: null,
                        });
                        setSearch("");
                      }}
                    >
                      <NetworkIcon size={15} />
                      <span>
                        {s.name}
                        <small>{cnpj(s.id)}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </>
              ) : null}
              {globalSearch.data?.procedures.length ? (
                <>
                  <span className="search-group">Procedimentos</span>
                  {globalSearch.data.procedures.map((t) => (
                    <button key={t.id} onClick={() => chooseCase(t.id)}>
                      <FileText size={15} />
                      <span>
                        {t.name}
                        <small>{t.id}</small>
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </>
              ) : null}
              {!suggestions.length &&
                !globalSearch.data?.suppliers.length &&
                !globalSearch.data?.procedures.length && (
                  <p>
                    {globalSearch.loading
                      ? "Buscando nas evidências…"
                      : "Nenhum resultado nesta carga."}
                  </p>
                )}
            </div>
          )}
        </div>
        <label className="filter">
          <span>Região</span>
          <select
            aria-label="Filtrar região"
            value={r}
            onChange={(e) => update({ r: e.target.value, m: null }, true)}
          >
            <option value="">Todo o Piauí</option>
            {bootstrap.regions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <label className="filter year-filter">
          <span>Resultados</span>
          <select
            aria-label="Filtrar período"
            value={y}
            onChange={(e) => update({ y: e.target.value }, true)}
          >
            <option value="">2024–2025</option>
            <option>2024</option>
            <option>2025</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label className="filter product-filter">
          <span>Medicamento</span>
          <select
            aria-label="Filtrar medicamento"
            value={p}
            onChange={(e) => update({ p: e.target.value }, true)}
          >
            <option value="">Quatro especificações</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        {(m || r || y || p || indicator) && (
          <button
            className="clear-filters"
            onClick={() =>
              update(
                { m: null, r: null, y: null, p: null, i: null, q: null },
                true,
              )
            }
          >
            Limpar filtros <X size={13} />
          </button>
        )}
      </div>
      <div className="context-line">
        <div className="breadcrumbs">
          <button onClick={() => update({ m: null, r: null }, true)}>
            Piauí
          </button>
          {region && (
            <>
              <ChevronRight size={12} />
              <span>{region.name}</span>
            </>
          )}
          {selected && (
            <>
              <ChevronRight size={12} />
              <span>{selected.name}</span>
            </>
          )}
        </div>
        <span>
          Carga {date(bootstrap.manifest.collectedAt)}{" "}
          <span className="desktop-only">
            · fontes oficiais ·{" "}
            {bootstrap.manifest.scope === "pilot"
              ? "piloto validado"
              : "cobertura parcial no estado"}
          </span>
        </span>
      </div>
      <main className="workspace">
        <section className="geography" aria-label="Exploração territorial">
          <MunicipalMap
            municipalities={bootstrap.municipalities}
            selected={m}
            regionIds={regionIds}
            counts={shown?.territory ?? []}
            onSelect={onMunicipality}
          />
          <div className="map-footnote">
            <Info size={14} />
            <span>
              Território da unidade compradora. Localização não comprova destino
              de entrega ou benefício.
            </span>
            <button onClick={() => update({ tab: "territories" })}>
              Ver em lista <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <aside
          className={`context-panel ${collapsed ? "is-collapsed" : ""}`}
          id="results"
          tabIndex={-1}
        >
          <button
            className="mobile-panel-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
          >
            {collapsed ? "Abrir resultados" : "Recolher resultados"}
            <ChevronDown size={16} />
          </button>
          <div className="panel-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {selected
                  ? "Município"
                  : region
                    ? "Região geográfica imediata"
                    : "Visão estadual"}{" "}
                · {y || "2024 e 2025"}
              </p>
            </div>
            <button
              className="icon-button"
              onClick={share}
              aria-label="Copiar link deste recorte"
            >
              {copied ? <Check size={19} /> : <ExternalLink size={19} />}
            </button>
          </div>
          <div className="panel-body">
            <div className="coverage-note">
              <span className="status-dot" />
              <p>
                {bootstrap.manifest.scope === "pilot"
                  ? "Piloto de três municípios."
                  : "Recorte ampliado para o Piauí."}{" "}
                <Link href="/metodologia#cobertura">Entenda a cobertura</Link>
              </p>
            </div>
            {exploration.error ? (
              <ErrorMessage message={exploration.error} />
            ) : !shown ? (
              <div className="skeleton-block" role="status">
                Consultando a carga validada…
              </div>
            ) : (
              <>
                <div className="summary-grid">
                  <div>
                    <strong>{number(shown.summary.procedures)}</strong>
                    <span>procedimentos</span>
                  </div>
                  <div>
                    <strong>{number(shown.summary.observations)}</strong>
                    <span>resultados de itens</span>
                  </div>
                  <div>
                    <strong>{number(shown.summary.suppliers)}</strong>
                    <span>fornecedores</span>
                  </div>
                </div>
                <div className="value-line">
                  <span>Valor homologado dos itens selecionados</span>
                  <strong>{currency(shown.summary.awardValue)}</strong>
                  <small>
                    Não representa valor pago ou gasto total do município.
                    {shown.summary.missingValue
                      ? ` ${shown.summary.missingValue} resultados sem total informado.`
                      : ""}
                  </small>
                </div>
                {caseId && (
                  <div className="detail-section">
                    <button
                      className="back-link"
                      onClick={() => update({ case: null, supplier: null })}
                    >
                      <ArrowLeft size={14} />
                      Voltar aos procedimentos
                    </button>
                    {detail.error ? (
                      <ErrorMessage message={detail.error} />
                    ) : detail.data ? (
                      <ProcedureDetail
                        detail={detail.data}
                        onSupplier={(id) =>
                          update({ supplier: id, tab: "network" })
                        }
                        onNetwork={() => update({ tab: "network" })}
                      />
                    ) : (
                      <p role="status">Carregando evidências…</p>
                    )}
                  </div>
                )}
                {supplierId && supplier.data && (
                  <section className="supplier-section">
                    <button
                      className="back-link"
                      onClick={() =>
                        update({ supplier: null, tab: "purchases" })
                      }
                    >
                      <ArrowLeft size={14} />
                      Voltar à contratação
                    </button>
                    <h2>{supplier.data.name}</h2>
                    <p className="identifier">CNPJ {cnpj(supplier.data.id)}</p>
                    <p>
                      {supplier.data.summary.procedures} procedimentos em{" "}
                      {supplier.data.summary.municipalities} municípios nesta
                      carga.
                    </p>
                    <small className="muted">
                      Valores de resultados relacionados não representam receita
                      ou patrimônio da empresa.
                    </small>
                    <details>
                      <summary>Evolução e procedimentos relacionados</summary>
                      {supplier.data.evolution.map((e) => (
                        <p key={e.year}>
                          {e.year} · {e.observations} resultados ·{" "}
                          {currency(e.awardValue)}
                        </p>
                      ))}
                      {supplier.data.procedures.map((t) => (
                        <button
                          className="related-procedure"
                          key={t.id}
                          onClick={() => chooseCase(t.id)}
                        >
                          {t.municipality} · {t.sequence}/{t.year}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                    </details>
                  </section>
                )}
                {supplier.error && <ErrorMessage message={supplier.error} />}
                <div
                  className="panel-tabs"
                  role="tablist"
                  aria-label="Visualização dos resultados"
                >
                  {[
                    ["purchases", "Compras"],
                    ["comparisons", "Comparações"],
                    ["territories", "Municípios"],
                    ...(center ? [["network", "Rede"]] : []),
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      role="tab"
                      aria-selected={tab === id}
                      onClick={() => update({ tab: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" className="tab-content">
                  {tab === "purchases" && (
                    <>
                      <div className="list-heading">
                        <h2>
                          {caseId
                            ? "Outros procedimentos"
                            : "Procedimentos no recorte"}
                        </h2>
                        <span>{shown.total}</span>
                      </div>
                      <p className="muted small">
                        Mais recentes por publicação no PNCP.
                      </p>
                      {shown.procedures.length ? (
                        shown.procedures.map((t) => (
                          <button
                            className={`procedure-row ${caseId === t.id ? "selected-row" : ""}`}
                            key={t.id}
                            onClick={() => chooseCase(t.id)}
                          >
                            <span className="procedure-row-top">
                              <span>
                                <MapPin size={12} />
                                {t.municipality}
                              </span>
                              <span>
                                {t.year} ·{" "}
                                {t.srp ? "Registro de preços" : "Aquisição"}
                              </span>
                            </span>
                            <strong>{t.object}</strong>
                            <span className="procedure-row-bottom">
                              <span>
                                {t.matchedCount} itens padronizados ·{" "}
                                {date(t.publishedAt)}
                              </span>
                              <ArrowUpRight size={17} />
                            </span>
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Sem registros neste recorte"
                          text="Isso não significa ausência de compras públicas. A cobertura desta carga é limitada às fontes, períodos e especificações descritos na metodologia."
                        />
                      )}
                      {shown.totalPages > 1 && (
                        <div className="pagination">
                          <button
                            disabled={shown.page === 1}
                            onClick={() =>
                              update({ page: String(shown.page - 1) })
                            }
                          >
                            Anterior
                          </button>
                          <span>
                            {shown.page} de {shown.totalPages}
                          </span>
                          <button
                            disabled={shown.page === shown.totalPages}
                            onClick={() =>
                              update({ page: String(shown.page + 1) })
                            }
                          >
                            Próxima
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "comparisons" && (
                    <>
                      <div className="list-heading">
                        <h2>Preços com contexto</h2>
                        <Layers size={16} />
                      </div>
                      <p className="muted small">
                        Mesmo produto, unidade, ano e faixa de quantidade. A
                        referência pode incluir outros municípios.
                      </p>
                      <label className="indicator-filter">
                        Exibir
                        <select
                          aria-label="Filtrar indicador"
                          value={indicator}
                          onChange={(e) => update({ i: e.target.value }, true)}
                        >
                          <option value="">Todas as observações</option>
                          <option value="difference">
                            Diferenças acima do limiar com amostra suficiente
                          </option>
                        </select>
                      </label>
                      {shown.comparisons.length ? (
                        shown.comparisons.map((c) => (
                          <button
                            className="comparison-row"
                            key={c.id}
                            onClick={() => chooseCase(c.id.split(":")[0])}
                          >
                            <span>
                              <strong>{c.product}</strong>
                              <small>{c.municipality}</small>
                            </span>
                            <span>
                              <strong>{currency(c.price)}</strong>
                              <small>
                                {c.sufficient
                                  ? c.alert
                                    ? "Diferença para análise"
                                    : "Sem destaque pela regra"
                                  : "Amostra insuficiente"}
                              </small>
                            </span>
                            <ChevronRight size={15} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title="Sem comparações elegíveis"
                          text="Não há observações suficientes para o indicador selecionado. Nenhum alerta é fabricado."
                        />
                      )}
                      <p className="methodology-link">
                        <Link href="/metodologia#comparacao">
                          Como os preços são comparados{" "}
                          <ArrowUpRight size={14} />
                        </Link>
                      </p>
                    </>
                  )}
                  {tab === "territories" && (
                    <>
                      <div className="list-heading">
                        <h2>Municípios do Piauí</h2>
                        <span>224</span>
                      </div>
                      <p className="muted small">
                        Todos podem ser selecionados, mesmo sem dados na carga.
                      </p>
                      <div className="territory-list">
                        {bootstrap.municipalities
                          .filter((t) => !r || t.regionId === r)
                          .toSorted((a, b) =>
                            a.name.localeCompare(b.name, "pt-BR"),
                          )
                          .map((t) => (
                            <button
                              key={t.id}
                              onClick={() => onMunicipality(t.id)}
                            >
                              <span>
                                {t.name}
                                <small>{t.region}</small>
                              </span>
                              <span>
                                {shown.territory.find((c) => c.id === t.id)
                                  ?.count || "—"}
                                <ChevronRight size={14} />
                              </span>
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                  {tab === "network" && (
                    <>
                      <div className="network-heading">
                        <h2>Relações documentadas</h2>
                        <label>
                          Expansão
                          <select
                            aria-label="Profundidade da rede"
                            value={depth}
                            onChange={(e) => update({ depth: e.target.value })}
                          >
                            <option value={1}>1 salto</option>
                            <option value={2}>2 saltos</option>
                          </select>
                        </label>
                      </div>
                      <p className="muted small">
                        Vizinhança centrada no fornecedor, procedimento ou
                        território selecionado. Pode cruzar municípios. Relação
                        de resultado não comprova contrato ou pagamento.
                      </p>
                      {!center ? (
                        <Empty
                          title="Escolha o centro da rede"
                          text="Selecione um município, procedimento ou fornecedor para explorar suas relações documentadas."
                        />
                      ) : graph.error ? (
                        <ErrorMessage message={graph.error} />
                      ) : graph.data ? (
                        <Network
                          graph={graph.data}
                          center={center}
                          onCenter={(id) => update({ center: id })}
                        />
                      ) : (
                        <p role="status">Consultando a projeção do Neo4j…</p>
                      )}
                    </>
                  )}
                </div>
                <a
                  className="export-button"
                  href={`/api/export?${browseQuery}`}
                >
                  <ArrowDownToLine size={16} />
                  Exportar evidências do recorte <ArrowUpRight size={14} />
                </a>
              </>
            )}
            <div className="panel-disclaimer">
              <Info size={15} />
              <p>
                Diferenças de preços e relações são pontos de partida para
                análise. Não constituem conclusão de fraude ou irregularidade.
              </p>
            </div>
          </div>
        </aside>
      </main>
      <footer className="app-footer">
        <span>PIAUIGRAPH · projeto independente de portfólio</span>
        <span>
          IBGE + PNCP <span className="footer-dot">·</span>{" "}
          {bootstrap.manifest.neo4j.verified
            ? "Rede verificada no Neo4j"
            : "Rede pendente de verificação"}
        </span>
        <Link href="/fontes">
          Origem e versão dos dados <ArrowUpRight size={12} />
        </Link>
      </footer>
    </div>
  );
}

function ProcedureDetail({
  detail,
  onSupplier,
  onNetwork,
}: {
  detail: Detail;
  onSupplier: (id: string) => void;
  onNetwork: () => void;
}) {
  const p = detail.procedure;
  return (
    <article className="procedure-detail">
      <div className="detail-title">
        <FileText size={20} />
        <h2 tabIndex={-1}>
          Procedimento {p.sequence}/{p.year}
        </h2>
      </div>
      <p className="identifier">{p.id}</p>
      <p>{p.object}</p>
      <dl className="facts">
        <div>
          <dt>Órgão</dt>
          <dd>{p.agency}</dd>
        </div>
        <div>
          <dt>Unidade</dt>
          <dd>{p.unit}</dd>
        </div>
        <div>
          <dt>Modalidade</dt>
          <dd>{p.mode}</dd>
        </div>
        <div>
          <dt>Publicação</dt>
          <dd>{date(p.publishedAt)}</dd>
        </div>
        <div>
          <dt>Estimado do procedimento</dt>
          <dd>{currency(p.estimated)}</dd>
        </div>
        <div>
          <dt>Homologado do procedimento</dt>
          <dd>{currency(p.homologated)}</dd>
        </div>
      </dl>
      <p className="small muted">
        Os valores acima abrangem o procedimento original, podendo incluir itens
        fora das quatro especificações. Não são somados ao valor do recorte.
      </p>
      <div className="evidence-actions">
        <a href={p.officialUrl} target="_blank" rel="noreferrer">
          Abrir no PNCP <ExternalLink size={14} />
        </a>
        <button onClick={onNetwork}>
          <NetworkIcon size={15} />
          Explorar rede
        </button>
      </div>
      <h3>Resultados dos itens selecionados</h3>
      {detail.observations.length ? (
        detail.observations.map((c) => (
          <ComparisonEvidence
            key={c.observed.id}
            comparison={c}
            onSupplier={onSupplier}
          />
        ))
      ) : (
        <Empty
          title="Sem resultado elegível"
          text="O procedimento contém especificações candidatas, mas os resultados disponíveis não atendem aos critérios desta carga."
        />
      )}
      <details className="exclusions">
        <summary>
          {detail.exclusions.length} exclusões e limitações de itens
        </summary>
        {detail.exclusions.length ? (
          detail.exclusions.map((e, i) => (
            <p key={i}>
              <strong>Item {e.item}:</strong> {e.description}
              <br />
              <span>{e.reason}</span>{" "}
              <a href={e.url} target="_blank" rel="noreferrer">
                Fonte
              </a>
            </p>
          ))
        ) : (
          <p>Nenhuma exclusão nas especificações candidatas consultadas.</p>
        )}
      </details>
      <p className="capture-note">
        Capturado em {date(p.source.capturedAt)} ·{" "}
        <a href={p.source.url} target="_blank" rel="noreferrer">
          Resposta oficial da API
        </a>
      </p>
    </article>
  );
}
function ComparisonEvidence({
  comparison: c,
  onSupplier,
}: {
  comparison: Comparison;
  onSupplier: (id: string) => void;
}) {
  const o = c.observed;
  return (
    <section className="item-evidence">
      <div className="item-title">
        <h4>{o.product}</h4>
        <span>Item {o.item}</span>
      </div>
      <p className="small muted">{o.description}</p>
      <div className="item-price">
        <strong>{currency(o.unitPrice)}</strong>
        <span>por comprimido · {number(o.quantity)} unidades</span>
      </div>
      <p className="small">
        Resultado homologado em {date(o.date)} · total informado{" "}
        {currency(o.total)}
      </p>
      <button
        className="supplier-link"
        onClick={() => onSupplier(o.supplierId)}
      >
        {o.supplier}
        <ArrowUpRight size={14} />
      </button>
      <p className="identifier">CNPJ {cnpj(o.supplierId)}</p>
      {o.precisionNote && (
        <p className="precision-note">
          <Info size={14} />
          {o.precisionNote}
        </p>
      )}
      <div className="sample-state">
        <span className="sample-label">
          {!c.validObserved
            ? "Registro inconsistente · destaque suspenso"
            : c.sufficient
            ? c.alert
              ? "Diferença observada para análise"
              : "Sem destaque pela regra"
            : "Dados insuficientes para alerta"}
        </span>
        <p>
          {c.references.length} observações de referência · {c.agencies}{" "}
          compradores · {c.suppliers} fornecedores
        </p>
        {c.sufficient && c.difference !== null ? (
          <p>
            Diferença para a mediana:{" "}
            <strong>{c.difference.toFixed(2).replace(".", ",")}%</strong>.
          </p>
        ) : !c.validObserved ? (
          <p>
            O registro observado requer conferência na fonte. Nenhum destaque
            é calculado enquanto persistir a inconsistência.
          </p>
        ) : (
          <p>
            O mínimo é 5 referências, de 3 compradores e 2 fornecedores. A
            comparação abaixo é descritiva.
          </p>
        )}
      </div>
      {c.references.length > 0 && (
        <div className="reference-table">
          <table>
            <caption>
              Referências elegíveis · mediana descritiva{" "}
              {currency(c.referenceMedian)}
            </caption>
            <thead>
              <tr>
                <th>Data / origem</th>
                <th>Quantidade</th>
                <th>Preço unitário</th>
              </tr>
            </thead>
            <tbody>
              {c.references.map((row) => (
                <tr key={row.id}>
                  <td>
                    <a href={row.source.url} target="_blank" rel="noreferrer">
                      {date(row.date)} <ExternalLink size={11} />
                    </a>
                    <small>{row.supplier}</small>
                  </td>
                  <td>{number(row.quantity)}</td>
                  <td>{currency(row.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details>
        <summary>Critérios e exclusões da referência</summary>
        <p>
          Comprimido simples, mesma substância e dosagem, mesmo ano, janela de
          até 180 dias e quantidade entre metade e dobro. O próprio procedimento
          é excluído; uma referência por procedimento. Não há ajuste por
          inflação ou condições de entrega não documentadas.
        </p>
        {Object.entries(c.reasons).map(([reason, count]) => (
          <p key={reason}>
            {reason}: {count}
          </p>
        ))}
      </details>
      <div className="item-links">
        <a href={o.source.url} target="_blank" rel="noreferrer">
          Resultado oficial <ExternalLink size={12} />
        </a>
        <a href={`/api/export?observation=${encodeURIComponent(o.id)}`}>
          CSV da comparação <ArrowDownToLine size={12} />
        </a>
      </div>
    </section>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <FileText size={25} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="error-state" role="alert">
      <strong>Consulta indisponível</strong>
      <p>{message}</p>
      <button onClick={() => window.location.reload()}>Tentar novamente</button>
    </div>
  );
}
