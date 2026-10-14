"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/icons";
import { BoltS } from "@/components/Logo";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Ringkasan", icon: "home" },
  { href: "/riwayat", label: "Riwayat latihan", icon: "history" },
  { href: "/target", label: "Target", icon: "target" },
  { href: "/rekor", label: "Performa terbaik", icon: "medal" },
  { href: "/chat", label: "Chat dengan Coach", icon: "chat" },
];

/** Which menu entry a path belongs to (a run's analysis lives under Riwayat). */
function sectionOf(pathname: string): string {
  if (pathname.startsWith("/aktivitas")) return "/riwayat";
  return ITEMS.find((i) => i.href !== "/" && pathname.startsWith(i.href))?.href ?? "/";
}

/**
 * The pink pill menu: a sticky column on wide screens, a bar floating at the
 * bottom of the screen on phones (AppShell leaves room for it).
 *
 * It is a client component so the tapped entry highlights immediately, and
 * every entry prefetches its full page in the background (`prefetch`), so
 * switching sections does not wait for the server.
 */
export function Sidebar({ showLogout }: { showLogout: boolean }) {
  const active = sectionOf(usePathname() ?? "/");

  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex items-center gap-2 rounded-3xl p-2 lg:sticky lg:inset-x-auto lg:bottom-auto lg:top-6 lg:z-auto lg:w-[72px] lg:shrink-0 lg:flex-col lg:self-start lg:py-5"
      style={{ background: "var(--pink)", color: "var(--on-color)", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.55)" }}
    >
      <Link
        href="/"
        prefetch
        aria-label="STRIDE+ beranda"
        className="mx-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl lg:mb-4 lg:flex"
        style={{ background: "var(--on-color)" }}
      >
        <BoltS size={30} id="sidebar" />
      </Link>
      <div className="flex flex-1 items-center justify-between gap-1 overflow-x-auto lg:flex-none lg:flex-col lg:justify-start">
        {ITEMS.map((item) => {
          const current = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-label={item.label}
              title={item.label}
              aria-current={current ? "page" : undefined}
              data-animate="pop"
              className="icon-button"
              style={
                current ? { background: "var(--on-color)", color: "var(--pink)" } : { color: "var(--on-color)" }
              }
            >
              <Icon name={item.icon} />
            </Link>
          );
        })}
      </div>
      {showLogout && (
        <form action={logout} className="lg:mt-8">
          <button
            type="submit"
            aria-label="Keluar"
            title="Keluar"
            className="icon-button"
            style={{ background: "rgba(10, 10, 12, 0.16)", color: "var(--on-color)" }}
          >
            <Icon name="logout" />
          </button>
        </form>
      )}
    </nav>
  );
}
