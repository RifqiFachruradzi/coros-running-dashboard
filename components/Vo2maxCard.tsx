"use client";

// VO2max as a 270° gauge split into fitness zones. On first view anime.js
// draws the zones one by one, then sweeps the marker along the arc while the
// number counts up, and leaves a soft pulse on the marker. The server render
// already shows the final state, so it reads fine without JavaScript or with
// reduced motion.

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

// The gauge spans this VO2max range (ml/kg/min).
const MIN = 30;
const MAX = 65;

// General adult zones. Real norms shift with age and sex, which COROS does
// not give us, so the card says these are a rough guide.
const ZONES = [
  { from: MIN, to: 38, label: "Rendah", color: "#ff4f9a" },
  { from: 38, to: 44, label: "Cukup", color: "#ff9466" },
  { from: 44, to: 50, label: "Baik", color: "#ffd23f" },
  { from: 50, to: 56, label: "Sangat baik", color: "#7db2ff" },
  { from: 56, to: MAX, label: "Elite", color: "#3d8bff" },
];

const SIZE = 240;
const C = SIZE / 2;
const R = 96;
const START = 135; // degrees, clockwise from +x; the gap sits at the bottom
const SWEEP = 270;
// Degrees between zones: wide enough that the round caps (half the stroke
// width, about 4–5° at this radius) leave a visible gap.
const GAP = 11;

const clamp = (v: number) => Math.min(Math.max(v, MIN), MAX);
const angleOf = (v: number) => START + ((clamp(v) - MIN) / (MAX - MIN)) * SWEEP;

function point(angle: number, radius = R): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)];
}

function arcPath(fromAngle: number, toAngle: number): string {
  const [x1, y1] = point(fromAngle);
  const [x2, y2] = point(toAngle);
  const large = toAngle - fromAngle > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function zoneOf(v: number) {
  return ZONES.find((z) => v < z.to) ?? ZONES[ZONES.length - 1];
}

export function Vo2maxCard({
  value,
  date,
  previous,
  runningLevel,
}: {
  value: number;
  date: string;
  /** An earlier assessment to compare against */
  previous: { value: number; date: string } | null;
  runningLevel: number | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<SVGGElement>(null);
  const haloRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const zoneLabelRef = useRef<HTMLSpanElement>(null);

  const zone = zoneOf(value);
  const [mx, my] = point(angleOf(value));
  const delta = previous ? value - previous.value : null;
  const nextZone = ZONES[ZONES.indexOf(zone) + 1];

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const segments = Array.from(root.querySelectorAll<SVGPathElement>("[data-zone]"));
    const marker = markerRef.current;
    const halo = haloRef.current;
    const number = numberRef.current;
    if (!marker || !halo || !number) return;

    const moveMarker = (v: number) => {
      const [x, y] = point(angleOf(v));
      marker.setAttribute("transform", `translate(${(x - mx).toFixed(2)} ${(y - my).toFixed(2)})`);
      number.textContent = String(Math.round(v));
    };

    // Start state: zones undrawn, marker at the beginning of the scale.
    segments.forEach((s) => {
      s.style.strokeDasharray = "100";
      s.style.strokeDashoffset = "100";
    });
    moveMarker(MIN);
    marker.style.opacity = "0";
    const zoneLabel = zoneLabelRef.current;
    if (zoneLabel) zoneLabel.style.opacity = "0";

    const running: { revert: () => unknown }[] = [];
    const play = () => {
      running.push(
        animate(segments, {
          strokeDashoffset: [100, 0],
          delay: stagger(120),
          duration: 650,
          ease: "outQuad",
        })
      );
      const sweep = { v: MIN };
      running.push(
        animate(marker, { opacity: [0, 1], delay: 450, duration: 300, ease: "linear" })
      );
      running.push(
        animate(sweep, {
          v: value,
          delay: 450,
          duration: 1600,
          ease: "outBack(1.3)",
          onUpdate: () => moveMarker(sweep.v),
          onComplete: () => {
            moveMarker(value);
            running.push(
              animate(halo, {
                r: [12, 24],
                opacity: [0.55, 0],
                duration: 1800,
                ease: "outQuad",
                loop: true,
              })
            );
          },
        })
      );
      if (zoneLabel) {
        running.push(
          animate(zoneLabel, {
            opacity: [0, 1],
            translateY: [8, 0],
            delay: 1300,
            duration: 500,
            ease: "outQuad",
          })
        );
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      running.forEach((a) => a.revert());
      segments.forEach((s) => {
        s.style.strokeDasharray = "";
        s.style.strokeDashoffset = "";
      });
      marker.removeAttribute("transform");
      marker.style.opacity = "";
      if (zoneLabel) zoneLabel.style.opacity = "";
      number.textContent = String(value);
    };
  }, [value, mx, my]);

  return (
    <section ref={rootRef} className="card flex flex-col items-center gap-2 p-5" aria-labelledby="vo2max-title">
      <div className="flex w-full items-center justify-between gap-2">
        <h2 id="vo2max-title" className="text-base font-semibold">
          VO2max
        </h2>
        {delta !== null && delta !== 0 && (
          <span className={`pill ${delta > 0 ? "tone-blue" : "tone-pink"}`}>
            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} sejak {previous!.date.slice(8)}/{previous!.date.slice(5, 7)}
          </span>
        )}
      </div>

      <div className="relative w-full max-w-[240px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block w-full"
          role="img"
          aria-label={`VO2max ${value}, kategori ${zone.label}, skala ${MIN} sampai ${MAX}`}
        >
          {/* Faint full track behind the zones */}
          <path d={arcPath(START, START + SWEEP)} fill="none" stroke="var(--gridline)" strokeWidth={14} strokeLinecap="round" />
          {ZONES.map((z, i) => {
            const from = angleOf(z.from) + (i === 0 ? 0 : GAP / 2);
            const to = angleOf(z.to) - (i === ZONES.length - 1 ? 0 : GAP / 2);
            const active = z === zone;
            return (
              <path
                key={z.label}
                data-zone
                d={arcPath(from, to)}
                pathLength={100}
                fill="none"
                stroke={z.color}
                strokeWidth={active ? 16 : 12}
                strokeLinecap="round"
                opacity={active ? 1 : 0.75}
              />
            );
          })}
          {/* Scale ends */}
          {[MIN, MAX].map((v) => {
            const [x, y] = point(angleOf(v), R - 26);
            return (
              <text key={v} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--text-muted)">
                {v}
              </text>
            );
          })}
          <g ref={markerRef}>
            <circle ref={haloRef} cx={mx} cy={my} r={12} fill={zone.color} opacity={0} />
            <circle cx={mx} cy={my} r={11} fill={zone.color} stroke="var(--surface-2)" strokeWidth={4} />
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span ref={numberRef} className="text-5xl font-bold tabular-nums leading-none">
            {value}
          </span>
          <span className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            ml/kg/menit
          </span>
          <span
            ref={zoneLabelRef}
            className="pill mt-2"
            style={{ background: zone.color, color: "var(--on-color)" }}
          >
            {zone.label}
          </span>
        </div>
      </div>

      <dl className="grid w-full grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl px-2 py-2.5" style={{ background: "var(--surface-1)" }}>
          <dt className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Running level
          </dt>
          <dd className="text-lg font-bold tabular-nums">{runningLevel ?? "—"}</dd>
        </div>
        <div className="rounded-2xl px-2 py-2.5" style={{ background: "var(--surface-1)" }}>
          <dt className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {nextZone ? "Zona berikutnya" : "Zona tertinggi"}
          </dt>
          <dd className="text-lg font-bold tabular-nums">
            {nextZone ? `+${nextZone.from - value}` : "—"}
            {nextZone && (
              <span className="block text-[11px] font-semibold leading-tight" style={{ color: nextZone.color }}>
                {nextZone.label}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-center text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Penilaian COROS {date.slice(8)}/{date.slice(5, 7)}. Zona umum untuk dewasa; batas sebenarnya bergantung usia dan
        jenis kelamin.
      </p>
    </section>
  );
}
