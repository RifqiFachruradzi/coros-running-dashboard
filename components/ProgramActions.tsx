"use client";

import { useState } from "react";
import { acceptProgram, stopProgram, type ActionResult } from "@/app/actions";

function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) setError(result.error);
    } catch {
      setError("Koneksi gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run };
}

export function AcceptProgramButton({
  programId,
  programTitle,
  replacingTitle,
  disabledReason,
}: {
  programId: string;
  programTitle: string;
  /** Title of the currently active program, when accepting would replace it */
  replacingTitle?: string;
  disabledReason?: string;
}) {
  const { pending, error, run } = useAction();

  function onClick() {
    if (
      replacingTitle &&
      !window.confirm(
        `Ganti program "${replacingTitle}" dengan "${programTitle}"? Progres program lama tidak disimpan.`
      )
    ) {
      return;
    }
    run(() => acceptProgram(programId));
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !!disabledReason}
        className="btn-primary"
      >
        {pending ? "Menyimpan…" : replacingTitle ? "Ganti ke program ini" : "Terima program"}
      </button>
      {(error ?? disabledReason) && (
        <p
          className="text-xs mt-2"
          style={{ color: error ? "var(--status-critical)" : "var(--text-muted)" }}
        >
          {error ?? disabledReason}
        </p>
      )}
    </div>
  );
}

export function StopProgramButton({ programTitle }: { programTitle: string }) {
  const { pending, error, run } = useAction();

  function onClick() {
    if (!window.confirm(`Hentikan program "${programTitle}"? Progresnya tidak disimpan.`)) return;
    run(stopProgram);
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn-secondary"
      >
        {pending ? "Menghentikan…" : "Hentikan program"}
      </button>
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--status-critical)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
