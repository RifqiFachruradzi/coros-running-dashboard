"use client";

// Draw a running route on a map: tap to drop points, pick a shape (one way,
// loop back to the start, or out-and-back), name it and save. Distances are
// straight lines between your points, so put a point at every turn.

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngExpression, LayerGroup, Map as LeafletMap } from "leaflet";
import { deleteRoute, saveRoute } from "@/app/user-actions";
import { formatClock, formatPace } from "@/lib/aggregate";
import {
  ROUTE_SHAPE_LABEL,
  routeDistanceKm,
  suggestRoutes,
  type RouteShape,
  type SavedRoute,
} from "@/lib/insights";
import { Icon } from "@/components/icons";

// Jakarta, where the runs in this dashboard happen; "Lokasi saya" recenters.
const DEFAULT_CENTER: [number, number] = [-6.2, 106.85];
const SHAPES = Object.keys(ROUTE_SHAPE_LABEL) as RouteShape[];

function fmtKm(km: number) {
  return km.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RouteBuilder({
  routes,
  tomorrowKm,
  paceSecPerKm,
  storageReady,
}: {
  routes: SavedRoute[];
  tomorrowKm: number | null;
  paceSecPerKm: number | null;
  storageReady: boolean;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [points, setPoints] = useState<[number, number][]>([]);
  const [shape, setShape] = useState<RouteShape>("loop");
  const [name, setName] = useState("");
  const [viewing, setViewing] = useState<SavedRoute | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchKm, setSearchKm] = useState(tomorrowKm ? String(tomorrowKm) : "5");
  const [mapReady, setMapReady] = useState(false);

  const distanceKm = useMemo(() => routeDistanceKm(points, shape), [points, shape]);

  // Create the map once. Leaflet touches `window`, so it loads on the client only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, { zoomControl: true }).setView(DEFAULT_CENTER, 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e) => {
        setViewing(null);
        setPoints((list) => [...list, [e.latlng.lat, e.latlng.lng]]);
      });
      mapRef.current = map;
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw the route whenever the points or shape change.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!L || !layer || !mapReady) return;
    layer.clearLayers();
    if (points.length === 0) return;

    const line = points as LatLngExpression[];
    L.polyline(line, { color: "#ff4f9a", weight: 5, opacity: 0.95 }).addTo(layer);
    if (shape === "loop" && points.length > 2) {
      L.polyline([points[points.length - 1], points[0]], {
        color: "#ff4f9a",
        weight: 4,
        opacity: 0.7,
        dashArray: "6 8",
      }).addTo(layer);
    }
    points.forEach((p, i) => {
      const isStart = i === 0;
      const isEnd = i === points.length - 1 && points.length > 1;
      L.circleMarker(p, {
        radius: isStart || isEnd ? 8 : 5,
        color: "#0a0a0c",
        weight: 2,
        fillColor: isStart ? "#ffd23f" : isEnd ? "#3d8bff" : "#ff4f9a",
        fillOpacity: 1,
      })
        .bindTooltip(isStart ? "Start" : isEnd ? (shape === "oneway" ? "Finish" : "Titik balik") : `Titik ${i + 1}`)
        .addTo(layer);
    });
  }, [points, shape, mapReady]);

  function showRoute(route: SavedRoute) {
    setViewing(route);
    setPoints(route.points);
    setShape(route.shape);
    setMessage(null);
    const L = leafletRef.current;
    if (L && mapRef.current && route.points.length) {
      mapRef.current.fitBounds(L.latLngBounds(route.points), { padding: [40, 40] });
    }
    mapEl.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function newRoute() {
    setViewing(null);
    setPoints([]);
    setName("");
    setMessage(null);
  }

  function addCenterPoint() {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    setViewing(null);
    setPoints((list) => [...list, [c.lat, c.lng]]);
  }

  function locate() {
    if (!navigator.geolocation) {
      setMessage({ ok: false, text: "Browser ini tidak mendukung lokasi." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => setMessage({ ok: false, text: "Lokasi tidak bisa diambil. Cek izin lokasi browser." }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onSave() {
    setPending(true);
    setMessage(null);
    try {
      const result = await saveRoute({ name, points, shape });
      if (result.ok) {
        setMessage({ ok: true, text: `Rute "${name.trim()}" disimpan.` });
        setName("");
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "Koneksi gagal. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  async function onDelete(route: SavedRoute) {
    if (!window.confirm(`Hapus rute "${route.name}"?`)) return;
    const result = await deleteRoute(route.id).catch(() => ({ ok: false as const, error: "Koneksi gagal." }));
    if (!result.ok) setMessage({ ok: false, text: result.error });
    else if (viewing?.id === route.id) newRoute();
  }

  const searchTarget = Number(searchKm.replace(",", "."));
  const searchResults =
    Number.isFinite(searchTarget) && searchTarget > 0 ? suggestRoutes(routes, searchTarget, paceSecPerKm, 3) : [];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <section data-animate="rise" className="card flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{viewing ? viewing.name : "Buat rute"}</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {viewing
                ? "Rute tersimpan. Ketuk peta untuk mulai rute baru dari sini."
                : "Ketuk peta untuk menaruh titik di setiap belokan. Jarak dihitung garis lurus antartitik."}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={locate} className="icon-button tone-neutral" aria-label="Lokasi saya" title="Lokasi saya">
              <Icon name="crosshair" />
            </button>
            <button
              type="button"
              onClick={() => setPoints((list) => list.slice(0, -1))}
              disabled={!points.length || !!viewing}
              className="icon-button tone-neutral disabled:opacity-40"
              aria-label="Hapus titik terakhir"
              title="Hapus titik terakhir"
            >
              <Icon name="undo" />
            </button>
            <button
              type="button"
              onClick={newRoute}
              disabled={!points.length}
              className="icon-button tone-neutral disabled:opacity-40"
              aria-label="Mulai rute baru"
              title="Mulai rute baru"
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={mapEl}
            className="h-[360px] w-full overflow-hidden rounded-2xl sm:h-[460px]"
            style={{ background: "var(--surface-1)" }}
            role="application"
            aria-label="Peta untuk menggambar rute"
          />
          <div
            className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-2xl px-4 py-2.5"
            style={{ background: "var(--on-color)" }}
          >
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {ROUTE_SHAPE_LABEL[shape]} · {points.length} titik
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--yellow)" }}>
              {fmtKm(distanceKm)} km
            </p>
            {paceSecPerKm && distanceKm > 0 && (
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                ±{formatClock(distanceKm * paceSecPerKm)} di pace {formatPace(paceSecPerKm)}/km
              </p>
            )}
          </div>
        </div>

        <button type="button" onClick={addCenterPoint} className="btn-secondary self-start">
          <Icon name="plus" size={16} /> Tambah titik di tengah peta
        </button>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Bentuk rute</legend>
          {SHAPES.map((s) => (
            <label
              key={s}
              className={`pill min-h-[40px] cursor-pointer px-4 font-medium ${shape === s ? "" : "tone-neutral"}`}
              style={shape === s ? { background: "var(--pink)", color: "var(--on-color)" } : undefined}
            >
              <input type="radio" name="shape" value={s} checked={shape === s} onChange={() => setShape(s)} className="sr-only" />
              {ROUTE_SHAPE_LABEL[s]}
            </label>
          ))}
        </fieldset>

        {!viewing && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <label className="sr-only" htmlFor="route-name">
              Nama rute
            </label>
            <input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Nama rute, mis. Keliling komplek"
              className="field flex-1"
            />
            <button
              type="submit"
              disabled={pending || points.length < 2 || !name.trim() || !storageReady}
              className="btn-primary sm:w-auto sm:px-6"
            >
              {pending ? "Menyimpan…" : "Simpan rute"}
            </button>
          </form>
        )}
        {!storageReady && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Hubungkan Upstash Redis untuk menyimpan rute. Menggambar dan mengukur tetap bisa.
          </p>
        )}
        {message && (
          <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm ${message.ok ? "tone-blue" : "tone-pink"}`}>
            {message.text}
          </p>
        )}
      </section>

      <div className="flex flex-col gap-6">
        <section data-animate="rise" className="flex flex-col gap-3 rounded-[22px] p-5" style={{ background: "var(--yellow)", color: "var(--on-color)" }}>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Icon name="target" size={18} /> Rekomendasi rute
          </h2>
          <label className="flex items-center gap-2 text-sm">
            Untuk jarak
            <input
              value={searchKm}
              onChange={(e) => setSearchKm(e.target.value)}
              inputMode="decimal"
              aria-label="Jarak target dalam km"
              className="w-20 rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: "rgba(10, 10, 12, 0.12)", color: "var(--on-color)" }}
            />
            km
          </label>
          {tomorrowKm && Number(searchKm) !== tomorrowKm && (
            <button type="button" onClick={() => setSearchKm(String(tomorrowKm))} className="self-start text-xs underline underline-offset-2">
              Pakai jarak latihan besok ({tomorrowKm} km)
            </button>
          )}
          {routes.length === 0 ? (
            <p className="text-sm">Simpan beberapa rute dulu; rute yang paling pas dengan jarak latihanmu akan muncul di sini.</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm">Isi jarak dalam km.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {searchResults.map((s, i) => (
                <li key={s.route.id}>
                  <button
                    type="button"
                    onClick={() => showRoute(s.route)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-opacity hover:opacity-85"
                    style={{ background: i === 0 ? "var(--on-color)" : "rgba(10, 10, 12, 0.12)", color: i === 0 ? "var(--yellow)" : "var(--on-color)" }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {s.route.name}
                        {s.laps > 1 && ` × ${s.laps}`}
                      </span>
                      <span className="block text-xs opacity-80">
                        {fmtKm(s.totalKm)} km
                        {Math.abs(s.diffKm) >= 0.05 && ` (${s.diffKm > 0 ? "+" : "−"}${fmtKm(Math.abs(s.diffKm))})`}
                        {s.estimatedSeconds && ` · ±${formatClock(s.estimatedSeconds)}`}
                      </span>
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Rute tersimpan ({routes.length})</h2>
          {routes.length === 0 ? (
            <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              Belum ada rute tersimpan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...routes].reverse().map((r, i) => (
                <li
                  key={r.id}
                  className="card flex items-center gap-3 p-3"
                  style={viewing?.id === r.id ? { outline: "2px solid var(--pink)" } : undefined}
                >
                  <button type="button" onClick={() => showRoute(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${["tone-pink", "tone-blue", "tone-yellow"][i % 3]}`}>
                      <Icon name="map" size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.name}</span>
                      <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>
                        {fmtKm(r.distanceKm)} km · {ROUTE_SHAPE_LABEL[r.shape]}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(r)}
                    className="icon-button h-10 w-10 tone-neutral"
                    aria-label={`Hapus rute ${r.name}`}
                    title="Hapus rute"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
