import { AppShell } from "@/components/AppShell";

// Placeholder shown the instant you switch pages while the server renders
// the real one (each route's loading.tsx). It reuses the app frame so the
// menu stays put and only the content area shimmers.

function Block({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageSkeleton({ variant = "page" }: { variant?: "dashboard" | "page" | "chat" }) {
  return (
    <AppShell maxWidth={variant === "chat" ? 1240 : 1360}>
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-6 lg:py-1.5" aria-busy="true" aria-label="Memuat">
        {variant === "dashboard" ? (
          <>
            <Block className="h-48 rounded-[22px] sm:h-40" />
            <div className="flex flex-wrap gap-5">
              <Block className="h-80 min-w-0 flex-[999_1_460px] rounded-[26px]" />
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-5">
                <Block className="h-36 rounded-[26px]" />
                <Block className="h-40 rounded-[26px]" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <Block className="h-40 rounded-[22px]" />
              <Block className="h-40 rounded-[22px]" />
              <Block className="h-40 rounded-[22px]" />
            </div>
          </>
        ) : variant === "chat" ? (
          <div className="flex flex-col gap-5 lg:flex-row">
            <Block className="h-48 rounded-3xl lg:w-[280px]" />
            <Block className="h-[60vh] flex-1 rounded-3xl" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Block className="h-3 w-24 rounded-full" />
              <Block className="h-7 w-72 max-w-full rounded-xl" />
              <Block className="h-4 w-96 max-w-full rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Block className="h-24 rounded-[18px]" />
              <Block className="h-24 rounded-[18px]" />
              <Block className="h-24 rounded-[18px]" />
              <Block className="h-24 rounded-[18px]" />
            </div>
            <Block className="h-72 rounded-[22px]" />
            <Block className="h-56 rounded-[22px]" />
          </>
        )}
      </div>
    </AppShell>
  );
}
