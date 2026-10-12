import type { Metadata } from "next";
import { isLoginConfigured, safeNextPath } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk — Dashboard Lari" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <p className="eyebrow">COROS · Dashboard lari</p>
        <h1
          className="mt-1 text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Masuk
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Dashboard ini berisi data latihan dan kesehatan pribadi.
        </p>
        {isLoginConfigured() ? (
          <LoginForm next={safeNextPath(next)} />
        ) : (
          <p
            role="alert"
            className="mt-6 rounded-xl p-3 text-sm"
            style={{ border: "1px solid var(--status-critical)", color: "var(--text-primary)" }}
          >
            Login belum dikonfigurasi. Isi <code>DASHBOARD_EMAIL</code> dan{" "}
            <code>DASHBOARD_PASSWORD</code> di Vercel (Settings → Environment Variables), lalu
            redeploy.
          </p>
        )}
      </div>
    </main>
  );
}
