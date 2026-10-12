// Display formatting shared by the history, records and analysis pages.

/** 18867 → "5 j 14 m"; under an hour → "42 m". */
export function formatHours(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} j ${m} m` : `${m} m`;
}

/** Signed seconds as "+0:12" / "−0:50" for pace differences. */
export function formatSignedPace(deltaSec: number): string {
  const sign = deltaSec < 0 ? "−" : "+";
  const total = Math.round(Math.abs(deltaSec));
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** 4.5 → "4,5"; Indonesian decimal comma for prose. */
export function formatNumber(n: number, digits = 1): string {
  return n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
