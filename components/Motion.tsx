"use client";

// Entrance animations with anime.js, layered on top of server-rendered markup:
//   data-animate="rise" — fades in and slides up as it scrolls into view
//   data-animate="bar"  — a progress fill that grows from the left
//   data-animate="pop"  — sidebar icons that scale in once on load
// Everything is fully visible without JavaScript, and nothing moves when the
// visitor asks for reduced motion.

import { useEffect } from "react";
import { animate, stagger } from "animejs";

export function Motion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const running: { revert: () => unknown }[] = [];

    const pops = document.querySelectorAll<HTMLElement>('[data-animate="pop"]');
    if (pops.length) {
      running.push(
        animate(pops, {
          opacity: [0, 1],
          scale: [0.6, 1],
          delay: stagger(50),
          duration: 500,
          ease: "outBack",
        })
      );
    }

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-animate="rise"], [data-animate="bar"]')
    );
    for (const el of targets) {
      if (el.dataset.animate === "bar") {
        el.style.transformOrigin = "left center";
        el.style.transform = "scaleX(0)";
      } else {
        el.style.opacity = "0";
      }
    }

    // Animate whatever entered the viewport together, staggered in page order.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        if (!visible.length) return;
        visible.forEach((el) => observer.unobserve(el));

        const rises = visible.filter((el) => el.dataset.animate === "rise");
        const bars = visible.filter((el) => el.dataset.animate === "bar");
        if (rises.length) {
          running.push(
            animate(rises, {
              opacity: [0, 1],
              translateY: [18, 0],
              delay: stagger(70),
              duration: 700,
              ease: "outExpo",
            })
          );
        }
        if (bars.length) {
          running.push(
            animate(bars, {
              scaleX: [0, 1],
              delay: stagger(90, { start: 250 }),
              duration: 1100,
              ease: "outQuart",
            })
          );
        }
      },
      { threshold: 0.12 }
    );
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      running.forEach((a) => a.revert());
      for (const el of targets) {
        el.style.opacity = "";
        el.style.transform = "";
      }
    };
  }, []);

  return null;
}
