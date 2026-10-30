"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as GLMap } from "maplibre-gl";
import type { FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { Plus, Minus, Maximize2, Map as MapIcon } from "lucide-react";
import type { Municipality } from "@/lib/model";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MunicipalMap({
  municipalities,
  selected,
  regionIds,
  counts,
  onSelect,
}: {
  municipalities: Municipality[];
  selected: string;
  regionIds: string[];
  counts: { id: string; count: number }[];
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<GLMap | null>(null);
  const mesh = useRef<FeatureCollection<Geometry, GeoJsonProperties> | null>(
    null,
  );
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState("");
  useEffect(() => {
    let disposed = false;
    let map: GLMap | undefined;
    async function create() {
      try {
        const [maplibre, geo] = await Promise.all([
          import("maplibre-gl"),
          fetch("/geo/piaui.geojson").then((r) => {
            if (!r.ok) throw new Error("Malha indisponível");
            return r.json();
          }),
        ]);
        if (disposed || !host.current) return;
        maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        maplibre.setWorkerCount(1);
        mesh.current = geo;
        map = new maplibre.Map({
          container: host.current,
          style: {
            version: 8,
            sources: {},
            layers: [
              {
                id: "background",
                type: "background",
                paint: { "background-color": "#e8eeea" },
              },
            ],
          },
          bounds: [
            [-46.1, -11.1],
            [-40.3, -2.7],
          ],
          fitBoundsOptions: { padding: 30 },
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          maxZoom: 11,
          minZoom: 4,
        });
        instance.current = map;
        map.on("load", () => {
          if (!map || disposed) return;
          map.addSource("municipalities", {
            type: "geojson",
            data: geo,
            promoteId: "codarea",
            attribution: "Limites municipais: IBGE",
          });
          map.addLayer({
            id: "municipal-fill",
            type: "fill",
            source: "municipalities",
            paint: {
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                "#087a72",
                [">", ["coalesce", ["feature-state", "count"], 0], 0],
                "#6baba0",
                ["boolean", ["feature-state", "region"], false],
                "#b8d8d0",
                "#d6e2da",
              ],
              "fill-opacity": 0.96,
            },
          });
          map.addLayer({
            id: "municipal-line",
            type: "line",
            source: "municipalities",
            paint: {
              "line-color": "#f8faf6",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                4,
                0.6,
                8,
                1.5,
              ],
            },
          });
          map.addLayer({
            id: "selected-line",
            type: "line",
            source: "municipalities",
            paint: {
              "line-color": "#163247",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false],
                2,
                0,
              ],
            },
          });
          map.on("click", "municipal-fill", (e) => {
            const id = String(e.features?.[0]?.properties?.codarea ?? "");
            if (/^22\d{5}$/.test(id)) onSelectRef.current(id);
          });
          map.on("mousemove", "municipal-fill", (e) => {
            const id = String(e.features?.[0]?.properties?.codarea ?? "");
            setHover(municipalities.find((m) => m.id === id)?.name ?? "");
            map!.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "municipal-fill", () => {
            setHover("");
            map!.getCanvas().style.cursor = "";
          });
          map.once("idle", () => {
            if (disposed) return;
            setError(false);
            setReady(true);
          });
        });
        map.on("error", () => {
          if (!map?.loaded()) setError(true);
        });
      } catch (e) {
        console.error("Falha ao carregar o mapa municipal:", e);
        if (!disposed) setError(true);
      }
    }
    void create();
    const resize = new ResizeObserver(() => instance.current?.resize());
    if (host.current) resize.observe(host.current);
    return () => {
      disposed = true;
      resize.disconnect();
      map?.remove();
      instance.current = null;
    };
  }, [municipalities]);
  useEffect(() => {
    const map = instance.current;
    if (!ready || !map) return;
    for (const m of municipalities)
      map.setFeatureState(
        { source: "municipalities", id: m.id },
        {
          selected: m.id === selected,
          region: regionIds.includes(m.id),
          count: counts.find((c) => c.id === m.id)?.count ?? 0,
        },
      );
    if (selected && mesh.current) {
      const feature = mesh.current.features.find(
        (f) => String(f.properties?.codarea) === selected,
      );
      if (feature) {
        const coordinates = (feature.geometry as { coordinates: unknown })
          .coordinates;
        const pairs: number[][] = [];
        function visit(x: unknown) {
          if (Array.isArray(x)) {
            if (typeof x[0] === "number") pairs.push(x as number[]);
            else x.forEach(visit);
          }
        }
        visit(coordinates);
        if (pairs.length)
          map.fitBounds(
            [
              [
                Math.min(...pairs.map((p) => p[0])),
                Math.min(...pairs.map((p) => p[1])),
              ],
              [
                Math.max(...pairs.map((p) => p[0])),
                Math.max(...pairs.map((p) => p[1])),
              ],
            ],
            {
              padding: 65,
              maxZoom: 8,
              duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? 0
                : 450,
            },
          );
      }
    } else if (!regionIds.length)
      map.fitBounds(
        [
          [-46.1, -11.1],
          [-40.3, -2.7],
        ],
        { padding: 30, duration: 0 },
      );
  }, [ready, selected, regionIds, counts, municipalities]);
  return (
    <div
      className="map-shell"
      data-testid="map-shell"
      data-map-ready={ready ? "true" : "false"}
    >
      <div
        ref={host}
        className="map-canvas"
        role="region"
        aria-label="Mapa municipal do Piauí. Use também a lista de municípios para selecionar por teclado."
      />
      {!ready && !error && (
        <div className="map-loading">
          <MapIcon size={28} />
          <span>Carregando limites do IBGE…</span>
        </div>
      )}
      {error && (
        <div className="map-error">
          <strong>O mapa não carregou.</strong>
          <span>A busca e a lista de municípios continuam disponíveis.</span>
        </div>
      )}
      <div className="map-label">
        <span>Piauí</span>
        <small>{hover || "224 municípios · limites oficiais do IBGE"}</small>
      </div>
      <div className="map-controls" aria-label="Controles do mapa">
        <button
          aria-label="Aproximar mapa"
          onClick={() => instance.current?.zoomIn()}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Afastar mapa"
          onClick={() => instance.current?.zoomOut()}
        >
          <Minus size={18} />
        </button>
        <button
          aria-label="Mostrar todo o Piauí"
          onClick={() =>
            instance.current?.fitBounds(
              [
                [-46.1, -11.1],
                [-40.3, -2.7],
              ],
              { padding: 30, duration: 0 },
            )
          }
        >
          <Maximize2 size={17} />
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-data" />
          Com registros neste recorte
        </span>
        <span>
          <i className="legend-empty" />
          Sem registros neste recorte
        </span>
        <span>
          <i className="legend-selected" />
          Selecionado
        </span>
      </div>
    </div>
  );
}
