// Overrides the dashboard skeleton from app/loading.tsx: the login page has
// no menu, so show just the dark page while it loads.
export default function Loading() {
  return <main className="min-h-dvh" aria-busy="true" aria-label="Memuat" />;
}
