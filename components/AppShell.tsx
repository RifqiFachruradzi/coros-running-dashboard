import { isAuthEnabled } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Motion } from "@/components/Motion";

/** The dark rounded app frame with the pink sidebar, shared by every page behind login. */
export function AppShell({
  active,
  maxWidth = 1360,
  children,
}: {
  active: string;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh px-3 py-4 sm:px-6 sm:py-8 lg:py-10">
      <div
        className="app-shell mx-auto flex flex-col gap-6 p-3 sm:p-5 lg:flex-row lg:flex-wrap lg:items-start"
        style={{ maxWidth }}
      >
        <Sidebar active={active} showLogout={isAuthEnabled()} />
        {children}
      </div>
      <Motion />
    </main>
  );
}

/** Title block at the top of a page's main column. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="mt-0.5 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
