"use client";

// Wraps a Recharts chart and plays an anime.js entrance the first time it
// scrolls into view: lines draw from left to right, the area under them
// fades in, then the data dots pop in one after another. Recharts' own
// animation is off, so the chart is complete without JavaScript and stays
// still when the visitor asks for reduced motion.

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

const LINES = ".recharts-line-curve, .recharts-area-curve";
const AREAS = ".recharts-area-area";
const DOTS = ".recharts-dot";

export function ChartReveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const running: { revert: () => unknown }[] = [];
    let prepared = false;
    let inView = false;
    let played = false;
    const query = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    // Hide the marks as soon as Recharts has drawn them (ResponsiveContainer
    // renders a frame later), so nothing flashes before the entrance.
    const prepare = () => {
      if (prepared || !root.querySelector(LINES)) return;
      prepared = true;
      for (const el of query<SVGElement>(`${LINES}, ${AREAS}, ${DOTS}`)) el.style.opacity = "0";
      play();
    };

    const play = () => {
      if (!prepared || !inView || played) return;
      played = true;

      // Measure now: the chart may have re-laid out since it was prepared.
      const lines = query<SVGPathElement>(LINES);
      for (const path of lines) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.opacity = "1";
      }
      running.push(
        animate(lines, {
          strokeDashoffset: 0,
          delay: stagger(120, { start: 80 }),
          duration: 900,
          ease: "inOutQuad",
          // Clear the dash so later re-renders (resize, hover) draw normally.
          onComplete: () => lines.forEach((p) => {
            p.style.strokeDasharray = "";
            p.style.strokeDashoffset = "";
          }),
        })
      );

      const areas = query<SVGPathElement>(AREAS);
      if (areas.length) {
        running.push(animate(areas, { opacity: [0, 1], delay: 350, duration: 600, ease: "outQuad" }));
      }

      const dots = query<SVGElement>(DOTS);
      for (const dot of dots) {
        dot.style.transformBox = "fill-box";
        dot.style.transformOrigin = "center";
      }
      if (dots.length) {
        running.push(
          animate(dots, {
            opacity: [0, 1],
            scale: [0, 1],
            delay: stagger(750 / Math.max(dots.length, 1), { start: 150 }),
            duration: 350,
            ease: "outBack(2)",
          })
        );
      }
    };

    const mutations = new MutationObserver(prepare);
    mutations.observe(root, { childList: true, subtree: true });
    prepare();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          inView = true;
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(root);

    return () => {
      mutations.disconnect();
      observer.disconnect();
      running.forEach((a) => a.revert());
      for (const el of query<SVGElement>(`${LINES}, ${AREAS}, ${DOTS}`)) {
        el.style.opacity = "";
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
      }
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
