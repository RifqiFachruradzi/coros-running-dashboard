import type { Metadata } from "next";
import { isLoginConfigured, safeNextPath } from "@/lib/auth";
import { BoltS } from "@/components/Logo";
import { Motion } from "@/components/Motion";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk — STRIDE+" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-6 sm:px-6">
      <div className="app-shell flex w-full max-w-[1000px] flex-col gap-5 p-3 sm:p-5 md:flex-row">
        <div
          data-animate="rise"
          className="flex flex-col gap-7 rounded-[26px] p-7 sm:p-9 md:min-h-[520px] md:flex-1"
          style={{ background: "var(--blue)", color: "var(--on-color)" }}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px]" style={{ background: "var(--on-color)" }}>
            <BoltS size={42} id="login" />
          </span>
          <div>
            <p className="text-5xl font-bold italic leading-none tracking-tight sm:text-6xl">
              STRIDE<span style={{ color: "var(--yellow)", WebkitTextStroke: "1.5px var(--on-color)" }}>+</span>
            </p>
            <p className="mt-3 text-xl font-semibold sm:text-2xl">Lari, catat, naik level.</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed">
              Data COROS-mu disinkronkan setiap malam, dengan pelatih AI yang membaca setiap kilometer.
            </p>
          </div>
          <div className="mt-auto flex gap-3" aria-hidden>
            <span className="h-3 flex-1 rounded-full" style={{ background: "var(--pink)" }} />
            <span className="h-3 flex-1 rounded-full" style={{ background: "var(--yellow)" }} />
            <span className="h-3 flex-1 rounded-full" style={{ background: "var(--on-color)" }} />
          </div>
        </div>

        <div className="flex items-center justify-center px-2 py-6 sm:p-6 md:flex-1">
          <div data-animate="rise" className="w-full max-w-sm">
            <h1 className="text-2xl font-bold">
              Masuk ke STRIDE<span style={{ color: "var(--yellow)" }}>+</span>
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              STRIDE+ berisi data latihan dan kesehatan pribadimu.
            </p>
            {isLoginConfigured() ? (
              <LoginForm next={safeNextPath(next)} />
            ) : (
              <p role="alert" className="tone-pink mt-6 rounded-2xl p-4 text-sm">
                Login belum dikonfigurasi. Isi <code>DASHBOARD_EMAIL</code> dan{" "}
                <code>DASHBOARD_PASSWORD</code> di Vercel (Settings → Environment Variables), lalu redeploy.
              </p>
            )}
          </div>
        </div>
      </div>
      <Motion />
    </main>
  );
}
