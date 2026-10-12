import type { Metadata } from "next";
import Link from "next/link";
import { CoachChat } from "@/components/CoachChat";

export const metadata: Metadata = { title: "Chat Coach — Dashboard Lari" };

export default function ChatPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link href="/" className="text-sm hover:underline" style={{ color: "var(--text-secondary)" }}>
        ← Kembali ke dashboard
      </Link>
      <div className="mt-3">
        <CoachChat />
      </div>
    </main>
  );
}
