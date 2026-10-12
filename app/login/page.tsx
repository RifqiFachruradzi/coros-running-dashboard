import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth";
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
        <LoginForm next={safeNextPath(next)} />
      </div>
    </main>
  );
}
