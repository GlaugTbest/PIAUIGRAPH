"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  SlidersHorizontal,
  X,
  Download,
  Check,
  Building2,
  FileText,
  Network as NetworkIcon,
  Info,
  ChevronDown,
  RotateCcw,
  Copy,
  ExternalLink,
} from "lucide-react";
import type {
  Dataset,
  Graph,
  Manifest,
  Procedure,
  PublicContract,
} from "@/lib/model";
import type {
  catalogExplore,
  contractExplore,
  valueCheck,
} from "@/lib/catalog";
import { TOPICS } from "@/lib/catalog";
import { readableObject } from "@/lib/text";
import type { compare } from "@/lib/analysis";
const MunicipalMap = dynamic(() => import("./municipal-map"), {
  ssr: false,
  loading: () => <p className="loading-state">Preparando o mapa…</p>,
});
const Network = dynamic(() => import("./evidence-network"), {
  loading: () => <p className="loading-state">Preparando as ligações…</p>,
});
type Catalog = ReturnType<typeof catalogExplore>;
type Contracts = ReturnType<typeof contractExplore>;
type Comparison = ReturnType<typeof compare>;
type RecordData =
  | {
      kind: "procedure";
      record: Procedure;
      topic: string;
      check: ReturnType<typeof valueCheck>;
      contracts: PublicContract[];
      comparisons: Comparison[];
      exclusions: Dataset["exclusions"];
    }
  | {
      kind: "contract";
      record: PublicContract;
      topic: string;
      procedure: Procedure | null;
    };
type Company = {
  totalContracts: number;
  id: string;
  name: string;
  contracts: PublicContract[];
  observations: Dataset["observations"];
  municipalities: number;
};
type Bootstrap = {
  municipalities: Dataset["municipalities"];
  regions: Dataset["regions"];
  manifest: Pick<Manifest, "collectedAt" | "version">;
};
const money = (n: number | null | undefined) =>
  n == null
    ? "Não informado"
    : n === 0
      ? "Valor zerado na fonte"
      : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number) => n.toLocaleString("pt-BR");
const date = (s: string) =>
  s && Number.isFinite(Date.parse(s))
    ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString(
        "pt-BR",
      )
    : "Não informada";
const cnpj = (s: string) =>
  s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
const pct = (n: number) =>
  `${Math.abs(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
}
function subscribeWide(cb: () => void) {
  const media = window.matchMedia("(min-width: 1000px)");
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
}
function useResource<T>(url: string | null) {
  const [state, setState] = useState<{
    url: string;
    data?: T;
    error?: string;
  }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!url) return;
    const abort = new AbortController();
    fetch(url, { signal: abort.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw Error(body.error ?? "A consulta não pôde ser carregada.");
        return body;
      })
      .then((data) => setState({ url, data }))
      .catch((e) => {
        if (!abort.signal.aborted) setState({ url, error: e.message });
      });
    return () => abort.abort();
  }, [url, retry]);
  return {
    data: state?.url === url ? state.data : undefined,
    error: state?.url === url ? state.error : undefined,
    retry: () => {
      setState(undefined);
      setRetry((n) => n + 1);
    },
  };
}
export default function CivicExplorer({ bootstrap }: { bootstrap: Bootstrap }) {
  const query = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 1000px)").matches,
    () => false,
  );
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const q = params.get("q") ?? "",
    m = params.get("m") ?? "",
    r = params.get("r") ?? "",
    y = params.get("y") ?? "",
    topic = params.get("topic") ?? "",
    mode = params.get("mode") ?? "",
    signal = params.get("signal") ?? "",
    tab = params.get("tab") ?? "purchases",
    id = params.get("case") ?? "",
    supplier = params.get("supplier") ?? "",
    depth = params.get("depth") === "1" ? 1 : 2;
  const [editedDraft, setEditedDraft] = useState<{
    query: string;
    value: string;
  }>();
  const draft = editedDraft?.query === q ? editedDraft.value : q;
  const setDraft = (value: string) => setEditedDraft({ query: q, value });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  function update(changes: Record<string, string | null>, reset = false) {
    const s = new URLSearchParams(window.location.search);
    if (reset)
      ["page", "case", "supplier", "center"].forEach((k) => s.delete(k));
    for (const [k, v] of Object.entries(changes)) {
      if (v) s.set(k, v);
      else s.delete(k);
    }
    if (
      s.get("tab") === "network" &&
      !["case", "supplier", "center", "m"].some((k) => s.get(k))
    )
      s.set("tab", "purchases");
    window.history.pushState(null, "", s.size ? `/?${s}` : "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  const browse = useMemo(() => {
    const s = new URLSearchParams();
    for (const k of [
      "q",
      "m",
      "r",
      "y",
      "topic",
      "mode",
      "signal",
      "sort",
      "page",
    ])
      if (params.has(k)) s.set(k, params.get(k)!);
    return s.toString();
  }, [params]);
  const catalog = useResource<Catalog>(`/api/catalog?${browse}`);
  const contracts = useResource<Contracts>(
    tab === "contracts" ? `/api/catalog?kind=contracts&${browse}` : null,
  );
  const detail = useResource<RecordData>(
    id ? `/api/record?id=${encodeURIComponent(id)}` : null,
  );
  const company = useResource<Company>(
    supplier ? `/api/company?id=${supplier}&y=${y}` : null,
  );
  const center =
    params.get("center") ||
    (supplier
      ? `supplier:${supplier}`
      : id
        ? `${id.includes("-2-") ? "contract" : "procedure"}:${id}`
        : m
          ? `municipality:${m}`
          : "");
  const graph = useResource<Graph>(
    tab === "network" && center
      ? `/api/graph?center=${encodeURIComponent(center)}&depth=${depth}&y=${y}`
      : null,
  );
  const place =
    bootstrap.municipalities.find((x) => x.id === m)?.name ??
    bootstrap.regions.find((x) => x.id === r)?.name ??
    "Todo o Piauí";
  const sortedMunicipalities = useMemo(
    () =>
      bootstrap.municipalities.toSorted((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [bootstrap.municipalities],
  );
  const regionIds = useMemo(
    () =>
      r
        ? bootstrap.municipalities
            .filter((x) => x.regionId === r)
            .map((x) => x.id)
        : [],
    [r, bootstrap.municipalities],
  );
  const shown = catalog.data;
  const hasFilters = !!(q || m || r || y || topic || mode || signal);
  useEffect(() => {
    if (id && detail.data) {
      detailHeading.current?.focus({ preventScroll: true });
      if (window.innerWidth < 1000)
        document
          .getElementById("record-panel")
          ?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [id, detail.data]);
  function chooseRecord(record: Procedure | PublicContract) {
    update({
      case: record.id,
      supplier: null,
      center: null,
      tab: record.id.includes("-2-") ? "contracts" : "purchases",
    });
  }
  function chooseCompany(id: string) {
    update({ supplier: id, case: null, center: null, tab: "network" });
  }
  function showNetwork() {
    update({ tab: "network", center: null });
    requestAnimationFrame(() =>
      document
        .getElementById("results")
        ?.scrollIntoView({ block: "start", behavior: "instant" }),
    );
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  const activeRecords = tab === "contracts" ? contracts.data : shown;
  return (
    <div className="civic-app">
      <a className="skip-link" href="#results">
        Ir para os resultados
      </a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="PIAUIGRAPH, início">
          <span className="brand-mark">
            <NetworkIcon size={23} />
          </span>
          <span>
            PIAUIGRAPH<small>Compras públicas do Piauí</small>
          </span>
        </Link>
        <nav aria-label="Navegação principal">
          <Link href="/metodologia">Como ler os dados</Link>
          <Link href="/fontes">
            Fontes <ArrowUpRight size={14} />
          </Link>
        </nav>
      </header>
      <main className="civic-main">
        <section className="search-section" aria-labelledby="search-title">
          <div className="search-heading">
            <h1 id="search-title">Encontre compras e serviços no Piauí.</h1>
            <p>
              Veja o que foi publicado, compare os valores e siga a informação
              até a fonte.
            </p>
          </div>
          <form
            className="main-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: draft.trim(), tab: "purchases" }, true);
            }}
          >
            <Search size={22} />
            <input
              aria-label="Buscar compras, serviços ou fornecedores"
              placeholder="O que você procura? Ex.: escola, obra, combustível…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={160}
            />
            {draft && (
              <button
                type="button"
                className="icon-button"
                aria-label="Apagar busca"
                onClick={() => {
                  setDraft("");
                  update({ q: null }, true);
                }}
              >
                <X size={18} />
              </button>
            )}
            <button className="primary-button" type="submit">
              Buscar <ArrowRight size={17} />
            </button>
          </form>
          <div className="filter-top">
            <button
              className="mobile-filter-button"
              aria-expanded={filtersOpen}
              aria-controls="search-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={17} />
              Filtrar{hasFilters ? " resultados" : ""}
              <ChevronDown size={15} />
            </button>
            <span className="period-note">
              2024 e 2025 · atualizado em {date(bootstrap.manifest.collectedAt)}
            </span>
          </div>
          <div
            className={`filter-row ${filtersOpen ? "open" : ""}`}
            id="search-filters"
          >
            <label>
              Município
              <select
                aria-label="Filtrar município"
                value={m}
                onChange={(e) => update({ m: e.target.value, r: null }, true)}
              >
                <option value="">Todo o Piauí</option>
                {sortedMunicipalities.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assunto
              <select
                aria-label="Filtrar assunto"
                value={topic}
                onChange={(e) => update({ topic: e.target.value }, true)}
              >
                <option value="">Todos os assuntos</option>
                {TOPICS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ano
              <select
                aria-label="Filtrar ano"
                value={y}
                onChange={(e) =>
                  update(
                    { y: e.target.value, page: null, case: null },
                    !supplier,
                  )
                }
              >
                <option value="">2024 e 2025</option>
                <option>2024</option>
                <option>2025</option>
              </select>
            </label>
            <label>
              Forma de contratação
              <select
                aria-label="Filtrar modalidade"
                value={mode}
                onChange={(e) => update({ mode: e.target.value }, true)}
              >
                <option value="">Todas as formas</option>
                <option value="6">Pregão eletrônico</option>
                <option value="4">Concorrência eletrônica</option>
                <option value="8">Dispensa</option>
                <option value="9">Inexigibilidade</option>
                <option value="12">Credenciamento</option>
                <option value="7">Pregão presencial</option>
                <option value="5">Concorrência presencial</option>
                <option value="14">Inaplicabilidade</option>
                {shown?.modes
                  .filter((x) => ![4, 5, 6, 7, 8, 9, 12, 14].includes(x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </label>
            <details className="extra-filter">
              <summary>
                Região <ChevronDown size={14} />
              </summary>
              <label>
                Região do IBGE
                <select
                  aria-label="Filtrar região"
                  value={r}
                  onChange={(e) => update({ r: e.target.value, m: null }, true)}
                >
                  <option value="">Todas as regiões</option>
                  {bootstrap.regions
                    .toSorted((a, b) => a.name.localeCompare(b.name))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              </label>
            </details>
            {hasFilters && (
              <button
                className="text-button clear-button"
                onClick={() => {
                  setDraft("");
                  update(
                    {
                      q: null,
                      m: null,
                      r: null,
                      y: null,
                      topic: null,
                      mode: null,
                      signal: null,
                    },
                    true,
                  );
                }}
              >
                <X size={15} />
                Limpar filtros
              </button>
            )}
          </div>
        </section>
        <div className="reading-bar">
          <div>
            <MapPin size={16} />
            <strong>{place}</strong>
            <span>
              {q ? `Busca: “${q}”` : "Todas as áreas de compras e serviços"}
            </span>
          </div>
          <button className="text-button" onClick={share}>
            {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
            {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
        <div
          className="workspace-tabs"
          role="tablist"
          aria-label="Explorar dados"
        >
          {[
            ["purchases", "Compras"],
            ["contracts", "Contratos"],
            ["map", "Mapa"],
            ["insights", "O que conferir"],
            ...(center ? [["network", "Ligações"]] : []),
          ].map(([key, label]) => (
            <button
              role="tab"
              aria-selected={tab === key}
              key={key}
              onClick={() => update({ tab: key, page: null })}
            >
              {label}
              {key === "purchases" && shown ? (
                <span>{num(shown.total)}</span>
              ) : key === "contracts" && shown ? (
                <span>{num(shown.summary.contracts)}</span>
              ) : null}
            </button>
          ))}
        </div>
        {catalog.error ? (
          <ErrorState message={catalog.error} retry={catalog.retry} />
        ) : !shown ? (
          <Loading text="Buscando na publicação verificada…" />
        ) : (
          <div
            className={`exploration-layout ${id || supplier ? "has-selection" : ""}`}
          >
            <section
              className={`results-area ${(id || supplier) && tab !== "network" ? "has-open-record" : ""}`}
              id="results"
              tabIndex={-1}
              aria-label="Resultados da busca"
            >
              {tab === "purchases" || tab === "contracts" ? (
                <>
                  <div className="results-heading">
                    <div>
                      <h2>
                        {tab === "contracts"
                          ? "Contratos e instrumentos publicados"
                          : "Compras encontradas"}
                      </h2>
                      <p>
                        {num(activeRecords?.total ?? 0)} registros
                        {hasFilters ? " neste recorte" : " na publicação"}.{" "}
                        {tab === "contracts"
                          ? "Valor publicado não comprova pagamento."
                          : "Estimativas e valores homologados não são gastos pagos."}
                      </p>
                    </div>
                    <label className="sort-control">
                      Ordenar
                      <select
                        aria-label="Ordenar resultados"
                        value={params.get("sort") ?? "recent"}
                        onChange={(e) =>
                          update({ sort: e.target.value, page: null })
                        }
                      >
                        <option value="recent">Mais recentes</option>
                        <option value="value">Maior valor</option>
                        {tab !== "contracts" && (
                          <option value="difference">
                            Maior diferença de valores
                          </option>
                        )}
                      </select>
                    </label>
                  </div>
                  {signal && (
                    <p className="active-signal">
                      <Info size={17} />
                      Mostrando valores homologados acima da estimativa. Isso
                      pede conferência, não comprova sobrepreço.
                      <button
                        onClick={() => update({ signal: null, page: null })}
                        aria-label="Remover filtro de diferença"
                      >
                        <X size={16} />
                      </button>
                    </p>
                  )}
                  {tab === "contracts" && contracts.error ? (
                    <ErrorState
                      message={contracts.error}
                      retry={contracts.retry}
                    />
                  ) : !activeRecords ? (
                    <Loading text="Buscando os contratos…" />
                  ) : activeRecords.total === 0 ? (
                    <Empty
                      title="Nenhum registro com estes filtros."
                      text={
                        tab === "purchases" && shown.summary.contracts
                          ? `Há ${num(shown.summary.contracts)} contratos que correspondem à busca. Abra a aba Contratos.`
                          : "Experimente um termo mais curto ou retire um filtro. Não encontrar um registro aqui não significa que a compra não existe."
                      }
                    />
                  ) : (
                    <>
                      <div className="purchase-list">
                        {tab === "contracts"
                          ? contracts.data?.rows.map((c) => (
                              <button
                                className={`purchase-row ${id === c.id ? "is-selected" : ""}`}
                                key={c.id}
                                onClick={() => chooseRecord(c)}
                              >
                                <div className="row-meta">
                                  <span>
                                    <MapPin size={13} />
                                    {c.municipality}
                                  </span>
                                  <span>
                                    {c.kind} · {c.year}
                                  </span>
                                </div>
                                <h3>{readableObject(c.object)}</h3>
                                <p className="row-agency">{c.supplier}</p>
                                <div className="row-bottom">
                                  <span>
                                    Valor global{" "}
                                    <strong>
                                      {money(c.globalValue ?? c.initialValue)}
                                    </strong>
                                  </span>
                                  <ArrowRight size={19} />
                                </div>
                              </button>
                            ))
                          : shown.rows.map((p) => (
                              <button
                                className={`purchase-row ${id === p.id ? "is-selected" : ""}`}
                                key={p.id}
                                onClick={() => chooseRecord(p)}
                              >
                                <div className="row-meta">
                                  <span>
                                    <MapPin size={13} />
                                    {p.municipality}
                                  </span>
                                  <span>
                                    {p.topic} · {p.year}
                                  </span>
                                </div>
                                <h3>{readableObject(p.object)}</h3>
                                <p className="row-agency">{p.agency}</p>
                                <div className="row-bottom">
                                  <span>
                                    Valor previsto{" "}
                                    <strong>{money(p.estimated)}</strong>
                                  </span>
                                  {p.check.above ? (
                                    <span className="check-tag">
                                      Valor para conferir
                                    </span>
                                  ) : (
                                    <span className="row-mode">{p.mode}</span>
                                  )}
                                  <ArrowRight size={19} />
                                </div>
                              </button>
                            ))}
                      </div>
                      <Pagination
                        page={activeRecords.page}
                        pages={activeRecords.pages}
                        onPage={(page) => {
                          update({ page: String(page) });
                          document.getElementById("results")?.scrollIntoView({
                            block: "start",
                            behavior: "instant",
                          });
                        }}
                      />
                      <ExportLinks
                        query={browse}
                        total={activeRecords.total}
                        contracts={tab === "contracts"}
                      />
                    </>
                  )}
                </>
              ) : tab === "map" ? (
                <>
                  <div className="results-heading">
                    <div>
                      <h2>Onde estão as compras</h2>
                      <p>
                        Escolha um município no mapa ou use a lista. A cor
                        mostra presença de registros, não risco de fraude.
                      </p>
                    </div>
                  </div>
                  <div className="large-map">
                    <MunicipalMap
                      municipalities={bootstrap.municipalities}
                      selected={m}
                      regionIds={regionIds}
                      counts={shown.territory}
                      onSelect={(selected) =>
                        update({ m: selected, r: null, tab: "purchases" }, true)
                      }
                    />
                  </div>
                  <details className="municipality-list">
                    <summary>
                      Escolher município pela lista <ChevronDown size={16} />
                    </summary>
                    <div>
                      {sortedMunicipalities.map((x) => (
                        <button
                          key={x.id}
                          onClick={() =>
                            update({ m: x.id, r: null, tab: "purchases" }, true)
                          }
                        >
                          {x.name}
                          <span>
                            {num(
                              shown.territory.find((t) => t.id === x.id)
                                ?.count ?? 0,
                            )}{" "}
                            compras
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                  <p className="muted">
                    O município é o da unidade que comprou. O registro não
                    informa, por si só, onde o bem foi entregue.
                  </p>
                </>
              ) : tab === "insights" ? (
                <Insights
                  catalog={shown}
                  onAbove={() =>
                    update(
                      {
                        signal: "above",
                        sort: "difference",
                        tab: "purchases",
                        page: null,
                      },
                      true,
                    )
                  }
                  onTopic={(t) => update({ topic: t, tab: "purchases" }, true)}
                />
              ) : tab === "network" ? (
                <>
                  <div className="results-heading">
                    <div>
                      <h2>Como estes registros se ligam</h2>
                      <p>
                        Cada linha corresponde a uma ligação documentada. Clique
                        em um registro para seguir o caminho.
                      </p>
                    </div>
                    <label className="sort-control">
                      Alcance
                      <select
                        aria-label="Alcance das ligações"
                        value={depth}
                        onChange={(e) => update({ depth: e.target.value })}
                      >
                        <option value="1">Ligações diretas</option>
                        <option value="2">Mais um passo</option>
                      </select>
                    </label>
                  </div>
                  {!center ? (
                    <Empty
                      title="Escolha por onde começar."
                      text="Abra uma compra, um contrato ou um fornecedor e escolha Ver ligações."
                    />
                  ) : graph.error ? (
                    <ErrorState message={graph.error} retry={graph.retry} />
                  ) : !graph.data ? (
                    <Loading text="Organizando as ligações documentadas…" />
                  ) : (
                    <Network
                      graph={graph.data}
                      center={center}
                      onCenter={(newCenter) => update({ center: newCenter })}
                    />
                  )}
                </>
              ) : null}
            </section>
            {id || supplier ? (
              <aside
                className="record-panel"
                id="record-panel"
                aria-label="Registro selecionado"
              >
                <button
                  className="back-button"
                  onClick={() =>
                    update({
                      case: null,
                      supplier: null,
                      center: null,
                      tab: id.includes("-2-") ? "contracts" : "purchases",
                    })
                  }
                >
                  <ArrowLeft size={16} />
                  Voltar aos resultados
                </button>
                {supplier ? (
                  <>
                    {company.error ? (
                      <ErrorState
                        message={company.error}
                        retry={company.retry}
                      />
                    ) : !company.data ? (
                      <Loading text="Abrindo o fornecedor…" />
                    ) : (
                      <CompanyPanel
                        company={company.data}
                        onRecord={chooseRecord}
                        onNetwork={showNetwork}
                      />
                    )}
                  </>
                ) : detail.error ? (
                  <ErrorState message={detail.error} retry={detail.retry} />
                ) : !detail.data ? (
                  <Loading text="Abrindo o registro…" />
                ) : (
                  <RecordPanel
                    data={detail.data}
                    headingRef={detailHeading}
                    onCompany={chooseCompany}
                    onRecord={chooseRecord}
                    onNetwork={showNetwork}
                  />
                )}
              </aside>
            ) : tab === "purchases" || tab === "contracts" ? (
              <aside className="context-area">
                <div className="context-map-title">
                  <h2>O Piauí neste recorte</h2>
                  <button
                    className="text-button"
                    onClick={() => update({ tab: "map" })}
                  >
                    Ampliar mapa <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="mini-map">
                  {wide && (
                    <MunicipalMap
                      municipalities={bootstrap.municipalities}
                      selected={m}
                      regionIds={regionIds}
                      counts={
                        tab === "contracts"
                          ? (contracts.data?.territory ?? [])
                          : shown.territory
                      }
                      onSelect={(selected) =>
                        update({ m: selected, r: null }, true)
                      }
                    />
                  )}
                </div>
                <p className="map-explanation">
                  {num(
                    tab === "contracts"
                      ? (contracts.data?.municipalities ?? 0)
                      : shown.summary.municipalities,
                  )}{" "}
                  municípios com{" "}
                  {tab === "contracts" ? "instrumentos" : "compras"}{" "}
                  encontrados. Cor significa presença de registros.
                </p>
                <div className="context-guide">
                  <h2>O que cada valor quer dizer?</h2>
                  <p>
                    <strong>Previsto</strong> é a previsão publicada para a
                    compra.
                  </p>
                  <p>
                    <strong>Resultado aprovado</strong> é o resultado aprovado e
                    informado pelo órgão.
                  </p>
                  <p>
                    <strong>Contrato</strong> é um instrumento publicado. Nenhum
                    desses valores comprova pagamento.
                  </p>
                  <Link href="/metodologia">
                    Entender as comparações <ArrowRight size={15} />
                  </Link>
                </div>
              </aside>
            ) : null}
          </div>
        )}
        <section className="coverage-footer">
          <Info size={18} />
          <div>
            <strong>Você está vendo dados publicados no PNCP.</strong>
            <p>
              {shown?.coverage.broad
                ? `${num(shown.coverage.all)} compras, sem filtro de assunto, nas modalidades consultadas. Itens detalhados são consultados na fonte quando você abre a compra. Contratos abrangem os órgãos encontrados no catálogo.`
                : "A publicação disponível está sendo ampliada. A cobertura e as datas efetivas estão no manifesto."}{" "}
              Ausência de registro não prova ausência de compra.
            </p>
            <Link href="/fontes">
              Ver fontes, cobertura e data de captura <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>PIAUIGRAPH · projeto independente de portfólio</span>
        <span>Informação pública para entender e conferir.</span>
        <Link
          href="https://github.com/GlaugTbest/PIAUIGRAPH"
          target="_blank"
          rel="noreferrer"
        >
          Código no GitHub <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Páginas de resultados">
      <button disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ArrowLeft size={15} />
        Anterior
      </button>
      <span>
        Página {num(page)} de {num(pages)}
      </span>
      <button disabled={page === pages} onClick={() => onPage(page + 1)}>
        Próxima
        <ArrowRight size={15} />
      </button>
    </nav>
  );
}
function ExportLinks({
  query,
  total,
  contracts,
}: {
  query: string;
  total: number;
  contracts: boolean;
}) {
  const count = Math.ceil(total / 1000);
  return (
    <details className="export-links">
      <summary>
        <Download size={16} />
        Baixar os resultados em planilha <ChevronDown size={14} />
      </summary>
      <p>
        CSV com os campos publicados e as fontes. Arquivos separados em até
        1.000 registros para manter o download rápido.
      </p>
      <div>
        {Array.from({ length: Math.min(count, 100) }, (_, i) => (
          <a
            key={i}
            href={`/api/catalog-export?${query}&kind=${contracts ? "contracts" : "purchases"}&offset=${i * 1000}`}
          >
            {count === 1
              ? "Baixar CSV"
              : `Registros ${num(i * 1000 + 1)} a ${num(Math.min(total, (i + 1) * 1000))}`}
            <Download size={14} />
          </a>
        ))}
      </div>
    </details>
  );
}
function Loading({ text }: { text: string }) {
  return (
    <p className="loading-state" role="status">
      <span className="loading-dot" />
      {text}
    </p>
  );
}
function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <h3>Não foi possível abrir esta consulta.</h3>
      <p>{message}</p>
      <button onClick={retry}>
        <RotateCcw size={15} />
        Tentar novamente
      </button>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <Search size={26} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Values({
  estimated,
  homologated,
}: {
  estimated: number | null;
  homologated: number | null;
}) {
  const max = Math.max(estimated ?? 0, homologated ?? 0, 1);
  return (
    <figure className="value-comparison">
      <figcaption>Valores publicados para a compra</figcaption>
      {[
        ["Previsto", estimated],
        ["Resultado aprovado", homologated],
      ].map(([label, v]) => (
        <div className="value-bar" key={String(label)}>
          <div>
            <span>{label}</span>
            <strong>{money(v as number | null)}</strong>
          </div>
          <div className="bar-track">
            <span
              style={{
                width:
                  v === null
                    ? "0%"
                    : `${(Math.max(0, Number(v)) / max) * 100}%`,
              }}
              className={label === "Resultado aprovado" ? "awarded" : ""}
            />
          </div>
        </div>
      ))}
      <p>Escala igual nas duas barras. Valor ausente fica sem barra.</p>
    </figure>
  );
}
function RecordPanel({
  data,
  headingRef,
  onCompany,
  onRecord,
  onNetwork,
}: {
  data: RecordData;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onCompany: (id: string) => void;
  onRecord: (p: Procedure | PublicContract) => void;
  onNetwork: () => void;
}) {
  const record = data.record;
  return (
    <>
      <div className="record-meta">
        <MapPin size={15} />
        {record.municipality}
        <span>{record.year}</span>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="record-title">
        {readableObject(record.object)}
      </h2>
      <p className="record-topic">
        {data.topic}
        {data.kind === "procedure"
          ? ` · ${data.record.mode}`
          : ` · ${data.record.kind}`}
      </p>
      {data.kind === "procedure" ? (
        <>
          <Values
            estimated={data.record.estimated}
            homologated={data.record.homologated}
          />
          {data.check.above && (
            <div className="value-question">
              <Info size={19} />
              <div>
                <strong>
                  O resultado está {pct(data.check.percent!)} acima da
                  estimativa.
                </strong>
                <p>
                  A diferença publicada é de {money(data.check.difference)}.
                  Confira quantidades, mudanças e retificações no processo. Essa
                  diferença não comprova superfaturamento.
                </p>
              </div>
            </div>
          )}
          <dl className="record-facts">
            <div>
              <dt>Quem publicou</dt>
              <dd>{data.record.agency}</dd>
            </div>
            <div>
              <dt>Unidade compradora</dt>
              <dd>{data.record.unit}</dd>
            </div>
            <div>
              <dt>Publicado em</dt>
              <dd>{date(data.record.publishedAt)}</dd>
            </div>
            <div>
              <dt>Situação no PNCP</dt>
              <dd>{data.record.status ?? "Não informada"}</dd>
            </div>
            <div>
              <dt>Registro de preços</dt>
              <dd>
                {data.record.srp
                  ? "Sim. Não implica compra de toda a quantidade."
                  : "Não informado como registro de preços."}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <div className="contract-values">
            <span>Valor global publicado</span>
            <strong>{money(data.record.globalValue)}</strong>
            <p>
              Não é valor pago. O índice de busca não informa o valor inicial.
            </p>
          </div>
          <dl className="record-facts">
            <div>
              <dt>Situação no PNCP</dt>
              <dd>
                {data.record.cancelled
                  ? "Cancelado na fonte"
                  : "Não marcado como cancelado"}
              </dd>
            </div>
            <div>
              <dt>Quem contratou</dt>
              <dd>{data.record.agency}</dd>
            </div>
            <div>
              <dt>Fornecedor informado</dt>
              <dd>
                {data.record.supplierId ? (
                  <button
                    className="entity-link"
                    onClick={() => onCompany(data.record.supplierId)}
                  >
                    {data.record.supplier}
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  data.record.supplier
                )}
              </dd>
            </div>
            <div>
              <dt>Assinado em</dt>
              <dd>{date(data.record.signedAt)}</dd>
            </div>
            <div>
              <dt>Vigência publicada</dt>
              <dd>
                {date(data.record.start)} a {date(data.record.end)}
              </dd>
            </div>
          </dl>
          {data.procedure && (
            <button
              className="outline-button full-width"
              onClick={() => onRecord(data.procedure!)}
            >
              <FileText size={16} />
              Abrir a compra que originou este instrumento
            </button>
          )}
          {!data.procedure && data.record.sourceProcedureUrl && (
            <a
              className="outline-button full-width"
              href={data.record.sourceProcedureUrl}
              target="_blank"
              rel="noreferrer"
            >
              Ver a compra de origem no PNCP <ExternalLink size={14} />
            </a>
          )}
        </>
      )}
      <div className="record-actions">
        <a
          className="primary-button"
          href={record.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          Abrir fonte oficial <ExternalLink size={16} />
        </a>
        <button className="outline-button" onClick={onNetwork}>
          <NetworkIcon size={16} />
          Ver ligações
        </button>
      </div>
      {data.kind === "procedure" && (
        <>
          <ItemsPanel key={data.record.id} procedure={data.record} />
          <section className="related-records">
            <h3>Contratos ligados a esta compra</h3>
            {data.contracts.length ? (
              data.contracts.map((c) => (
                <button key={c.id} onClick={() => onRecord(c)}>
                  <span>
                    {c.supplier}
                    <small>
                      {c.kind} · valor global{" "}
                      {money(c.globalValue ?? c.initialValue)}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))
            ) : (
              <p>
                Nenhum instrumento ligado a esta compra foi encontrado nesta
                carga. Isso não prova que não existe contrato.
              </p>
            )}
          </section>
          {data.comparisons.length > 0 && (
            <section className="medicine-comparisons">
              <h3>Preços de itens comparáveis</h3>
              <p>
                Somente os comprimidos padronizados abaixo têm comparação
                verificada. Outros produtos e serviços não são tratados como
                equivalentes.
              </p>
              {data.comparisons.map((c) => (
                <MedicineComparison
                  key={c.observed.id}
                  data={c}
                  onCompany={onCompany}
                />
              ))}
            </section>
          )}
        </>
      )}
      <details className="provenance">
        <summary>
          Conferir identificação e captura <ChevronDown size={15} />
        </summary>
        <dl>
          <dt>Identificador PNCP</dt>
          <dd>{record.id}</dd>
          <dt>CNPJ do órgão</dt>
          <dd>{cnpj(record.cnpj)}</dd>
          <dt>Redação publicada, com documentos pessoais omitidos</dt>
          <dd>{record.object}</dd>
          <dt>Resposta oficial capturada</dt>
          <dd>
            <a href={record.source.url} target="_blank" rel="noreferrer">
              Abrir os dados originais <ArrowUpRight size={13} />
            </a>
          </dd>
          <dt>Data da captura</dt>
          <dd>{date(record.source.capturedAt)}</dd>
          <dt>SHA-256 da resposta</dt>
          <dd className="hash">{record.source.sha256}</dd>
        </dl>
      </details>
    </>
  );
}
type Item = {
  id: number;
  description: string;
  unit: string | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
  hasResult: boolean;
  status: string | null;
};
type Result = {
  id: number;
  date: string | null;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
  supplier: string;
  supplierId: string | null;
  cancelled: boolean;
};
type OfficialPage<T> = {
  rows: T[];
  page: number;
  hasNext: boolean;
  truncated: boolean;
  source: { url: string; capturedAt: string; sha256: string };
  stale: boolean;
};
function ItemsPanel({ procedure }: { procedure: Procedure }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [item, setItem] = useState<number | null>(null);
  const items = useResource<OfficialPage<Item>>(
    open
      ? `/api/items?id=${encodeURIComponent(procedure.id)}&page=${page}`
      : null,
  );
  const result = useResource<OfficialPage<Result>>(
    item
      ? `/api/items?id=${encodeURIComponent(procedure.id)}&item=${item}`
      : null,
  );
  return (
    <section className="items-section">
      <button
        className="section-disclosure"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <FileText size={18} />
          Itens e preços desta compra
        </span>
        <ChevronDown size={17} />
      </button>
      {open && (
        <div className="items-content">
          <p>
            Consulta ao PNCP ao abrir esta seção. O preço do item é{" "}
            <strong>estimado</strong>; o resultado aprovado aparece
            separadamente.
          </p>
          {items.error ? (
            <ErrorState message={items.error} retry={items.retry} />
          ) : !items.data ? (
            <Loading text="Consultando os itens na fonte oficial…" />
          ) : !items.data.rows.length ? (
            <Empty
              title="Sem itens nesta resposta."
              text="Confira o processo na fonte oficial. Nenhum item foi inventado para preencher esta lista."
            />
          ) : (
            <>
              {items.data.stale && (
                <p className="notice">
                  O PNCP está indisponível; mostrando consulta anterior de{" "}
                  {date(items.data.source.capturedAt)}.
                </p>
              )}
              <div className="item-list">
                {items.data.rows.map((x) => (
                  <article className="official-item" key={x.id}>
                    <h4>
                      Item {x.id} · {x.description}
                    </h4>
                    <p>
                      {x.quantity == null
                        ? "Quantidade não informada"
                        : num(x.quantity)}{" "}
                      {x.unit ?? "unidade não informada"} · preço estimado{" "}
                      {money(x.unitPrice)}
                    </p>
                    <div className="item-total">
                      Total estimado: <strong>{money(x.total)}</strong>
                    </div>
                    {x.hasResult ? (
                      <button
                        className="text-button"
                        aria-expanded={item === x.id}
                        onClick={() => setItem(item === x.id ? null : x.id)}
                      >
                        Ver resultado e fornecedor <ChevronDown size={14} />
                      </button>
                    ) : (
                      <p className="muted">
                        Sem resultado publicado nesta resposta.
                      </p>
                    )}
                    {item === x.id &&
                      (result.error ? (
                        <ErrorState
                          message={result.error}
                          retry={result.retry}
                        />
                      ) : !result.data ? (
                        <Loading text="Consultando o resultado publicado…" />
                      ) : (
                        <div className="official-results">
                          {result.data.rows.length ? (
                            result.data.rows.map((row) => (
                              <div
                                key={row.id}
                                className={
                                  row.cancelled ? "cancelled-result" : ""
                                }
                              >
                                <strong>{row.supplier}</strong>
                                <p>
                                  {row.supplierId
                                    ? `CNPJ ${cnpj(row.supplierId)} · `
                                    : ""}
                                  {row.date
                                    ? date(row.date)
                                    : "Data não informada"}
                                  {row.cancelled
                                    ? " · Resultado cancelado"
                                    : " · Resultado aprovado"}
                                </p>
                                <p>
                                  Quantidade:{" "}
                                  {row.quantity == null
                                    ? "não informada"
                                    : num(row.quantity)}{" "}
                                  · unitário: {money(row.unitPrice)} · total:{" "}
                                  {money(row.total)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p>Nenhum resultado disponível.</p>
                          )}
                          <a
                            href={result.data.source.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Resultado oficial <ArrowUpRight size={13} />
                          </a>
                        </div>
                      ))}
                  </article>
                ))}
              </div>
              <div className="pagination">
                <button
                  disabled={page === 1}
                  onClick={() => {
                    setPage(page - 1);
                    setItem(null);
                  }}
                >
                  Itens anteriores
                </button>
                <span>Página {page}</span>
                <button
                  disabled={!items.data.hasNext}
                  onClick={() => {
                    setPage(page + 1);
                    setItem(null);
                  }}
                >
                  Mais itens
                </button>
              </div>
              <a
                className="source-link"
                href={items.data.source.url}
                target="_blank"
                rel="noreferrer"
              >
                Itens na fonte oficial <ArrowUpRight size={13} />
              </a>
              <p className="small muted">
                Consulta de {date(items.data.source.capturedAt)}.{" "}
                {items.data.stale
                  ? "Resposta anterior em cache."
                  : "Resposta da API oficial."}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
function MedicineComparison({
  data: c,
  onCompany,
}: {
  data: Comparison;
  onCompany: (id: string) => void;
}) {
  const o = c.observed;
  return (
    <article className="medicine-comparison">
      <h4>{o.product}</h4>
      <p>
        {num(o.quantity)} comprimidos · {date(o.date)}
      </p>
      <div className="comparison-price">
        <strong>{money(o.unitPrice)}</strong>
        <span>por comprimido</span>
      </div>
      <button className="entity-link" onClick={() => onCompany(o.supplierId)}>
        {o.supplier}
        <ArrowRight size={13} />
      </button>
      <p className={c.alert ? "comparison-callout" : "sample-note"}>
        {!c.validObserved
          ? "Registro inconsistente: análise suspensa."
          : c.sufficient
            ? c.alert
              ? `${pct(c.difference!)} acima da mediana de referência. Precisa de conferência.`
              : "Sem destaque pela regra de comparação."
            : "Amostra pequena: não é possível gerar um destaque confiável."}
      </p>
      <p>
        {c.references.length} referências · {c.agencies} compradores ·{" "}
        {c.suppliers} fornecedores. Mediana descritiva:{" "}
        {money(c.referenceMedian)}.
      </p>
      {o.precisionNote && <p className="notice">{o.precisionNote}</p>}
      <details>
        <summary>
          Como esta comparação foi feita <ChevronDown size={14} />
        </summary>
        <p>
          Mesmo comprimido e ano; até 180 dias; quantidade entre metade e dobro.
          Exclui a própria compra e usa uma referência por compra. Exige 5
          referências, 3 compradores e 2 fornecedores para destacar diferença
          acima de 30%.
        </p>
        {c.references.map((x) => (
          <a
            className="reference-row"
            key={x.id}
            href={x.source.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              {date(x.date)} · {num(x.quantity)} comprimidos
            </span>
            <strong>{money(x.unitPrice)}</strong>
            <ArrowUpRight size={13} />
          </a>
        ))}
      </details>
      <div className="comparison-links">
        <a href={o.source.url} target="_blank" rel="noreferrer">
          Resultado oficial <ExternalLink size={13} />
        </a>
        <a href={`/api/export?observation=${encodeURIComponent(o.id)}`}>
          CSV da comparação <Download size={13} />
        </a>
      </div>
    </article>
  );
}
function CompanyPanel({
  company,
  onRecord,
  onNetwork,
}: {
  company: Company;
  onRecord: (p: Procedure | PublicContract) => void;
  onNetwork: () => void;
}) {
  return (
    <>
      <p className="company-label">
        <Building2 size={17} />
        Fornecedor
      </p>
      <h2 className="record-title">{company.name}</h2>
      <p className="record-topic">CNPJ {cnpj(company.id)}</p>
      <p>
        {num(company.totalContracts)} instrumentos publicados e{" "}
        {num(company.observations.length)} resultados de itens nesta carga, em{" "}
        {num(company.municipalities)} municípios. Isso não representa
        faturamento, patrimônio ou dinheiro recebido.
      </p>
      <button className="outline-button full-width" onClick={onNetwork}>
        <NetworkIcon size={16} />
        Ver com quem este fornecedor se liga
      </button>
      <h3>Instrumentos encontrados</h3>
      {company.contracts.length ? (
        company.contracts.slice(0, 100).map((c) => (
          <button
            className="related-company-record"
            key={c.id}
            onClick={() => onRecord(c)}
          >
            <span>
              {c.municipality} · {c.year}
              <strong>{readableObject(c.object)}</strong>
              <small>
                {c.kind} · valor global {money(c.globalValue ?? c.initialValue)}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
        ))
      ) : (
        <p>
          Nenhum contrato desse fornecedor foi encontrado na parte de contratos
          da carga.
        </p>
      )}
      {company.contracts.length > 100 && (
        <p>
          Mostrando os 100 mais recentes. Use a busca e os filtros para reduzir
          o recorte.
        </p>
      )}
      <h3>Resultados de itens disponíveis</h3>
      {company.observations.map((o) => (
        <a
          className="reference-row"
          key={o.id}
          href={o.source.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>
            {o.product}
            <small>
              {date(o.date)} · {num(o.quantity)} comprimidos
            </small>
          </span>
          <strong>{money(o.unitPrice)}</strong>
          <ArrowUpRight size={14} />
        </a>
      ))}
      {!company.observations.length && (
        <p>
          Não há itens desse fornecedor no subconjunto de preços padronizados.
        </p>
      )}
    </>
  );
}
function Insights({
  catalog,
  onAbove,
  onTopic,
}: {
  catalog: Catalog;
  onAbove: () => void;
  onTopic: (id: string) => void;
}) {
  const [metric, setMetric] = useState<"count" | "estimated">("estimated");
  const max = Math.max(
    ...catalog.topics.map((t) =>
      metric === "count" ? t.count : (t.estimated ?? 0),
    ),
    1,
  );
  return (
    <section className="insights">
      <h2>Por onde começar a conferir?</h2>
      <p className="section-intro">
        Os dados ajudam a fazer perguntas. Uma diferença de valor ou uma ligação
        entre empresas e órgãos não permite concluir fraude por conta própria.
      </p>
      <section className="insight-row">
        <div>
          <h3>O valor aprovado passou da previsão?</h3>
          <p>
            Entre {num(catalog.summary.comparable)} compras com os dois valores
            publicados e situação normal, {num(catalog.summary.above)} têm total
            homologado acima do estimado.
          </p>
          <p>
            Compare os valores do mesmo processo. Quantidades, alterações e
            retificações podem explicar a diferença.
          </p>
          {catalog.summary.above > 0 ? (
            <button className="primary-button" onClick={onAbove}>
              Conferir essas {num(catalog.summary.above)} compras{" "}
              <ArrowRight size={16} />
            </button>
          ) : (
            <p className="sample-note">
              Nenhum caso encontrado com esses critérios neste recorte.
            </p>
          )}
        </div>
        <figure className="check-count-chart">
          <figcaption>Compras com os dois valores publicados</figcaption>
          <div className="stacked-bar">
            <span
              style={{
                width: `${(catalog.summary.above / Math.max(1, catalog.summary.comparable)) * 100}%`,
              }}
            />
            <span style={{ flex: 1 }} />
          </div>
          <div className="chart-legend">
            <span>
              <i />
              {num(catalog.summary.above)} acima do estimado
            </span>
            <span>
              <i />
              {num(catalog.summary.comparable - catalog.summary.above)} até o
              estimado
            </span>
          </div>
        </figure>
      </section>
      <section className="topics-chart">
        <h3>Onde há mais valor previsto?</h3>
        <p>
          Agrupamento sugerido pelas palavras do objeto. É uma forma de navegar;
          não é classificação oficial nem ranking de fraude. As estimativas não
          representam gastos pagos.
        </p>
        <label className="chart-control">
          Comparar por
          <select
            aria-label="Medida do gráfico de assuntos"
            value={metric}
            onChange={(e) => setMetric(e.target.value as "count" | "estimated")}
          >
            <option value="estimated">Valor previsto publicado</option>
            <option value="count">Quantidade de compras</option>
          </select>
        </label>
        {catalog.topics
          .filter((t) => t.count > 0)
          .toSorted(
            (a, b) =>
              (metric === "count" ? b.count : (b.estimated ?? 0)) -
              (metric === "count" ? a.count : (a.estimated ?? 0)),
          )
          .map((t) => (
            <button key={t.id} onClick={() => onTopic(t.id)}>
              <span>
                {t.name}
                <strong>
                  {metric === "count" ? num(t.count) : money(t.estimated)}
                </strong>
              </span>
              <span className="topic-track">
                <i
                  style={{
                    width: `${((metric === "count" ? t.count : (t.estimated ?? 0)) / max) * 100}%`,
                  }}
                />
              </span>
            </button>
          ))}
      </section>
      <section className="reading-guide">
        <h3>Antes de chamar de superfaturamento</h3>
        <p>
          Confira se o objeto e a quantidade são os mesmos, se houve mudança no
          processo e qual etapa o valor representa. Serviço, caixa, litro e
          unidade não podem ser comparados como se fossem a mesma coisa.
        </p>
        <Link href="/metodologia">
          Ver os critérios e as limitações <ArrowRight size={15} />
        </Link>
      </section>
    </section>
  );
}
