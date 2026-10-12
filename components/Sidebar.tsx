import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Ringkasan", icon: "home" },
  { href: "/riwayat", label: "Riwayat latihan", icon: "history" },
  { href: "/target", label: "Target", icon: "target" },
  { href: "/rute", label: "Rute", icon: "map" },
  { href: "/rekor", label: "Performa terbaik", icon: "medal" },
  { href: "/chat", label: "Chat dengan Coach", icon: "chat" },
];

/**
 * The pink pill menu: a column on wide screens, a scrollable row above the
 * content on phones. `active` is the href of the current section.
 */
export function Sidebar({ active, showLogout }: { active: string; showLogout: boolean }) {
  return (
    <nav
      aria-label="Menu utama"
      className="flex w-full shrink-0 items-center gap-2 rounded-3xl p-2 lg:sticky lg:top-6 lg:w-[72px] lg:flex-col lg:self-start lg:py-5"
      style={{ background: "var(--pink)", color: "var(--on-color)" }}
    >
      <span
        className="mx-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full lg:mb-4 lg:flex"
        style={{ border: "2px solid rgba(10, 10, 12, 0.4)" }}
        aria-hidden
      >
        <Icon name="logo" />
      </span>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto lg:flex-none lg:flex-col">
        {ITEMS.map((item) => {
          const current = item.href === active;
          return (
            <Link
              key={item.href}
              href={item.href}
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
