"use client";

import { useRef, useState } from "react";
import { addGoal, deleteGoal } from "@/app/user-actions";
import { GOAL_KIND_LABEL, type GoalKind } from "@/lib/insights";
import { Icon } from "@/components/icons";

const KINDS = Object.keys(GOAL_KIND_LABEL) as GoalKind[];

const RACE_PRESETS = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half", km: 21.0975 },
  { label: "Full", km: 42.195 },
];

export function GoalForm({ storageReady }: { storageReady: boolean }) {
  const [kind, setKind] = useState<GoalKind>("weekly_km");
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    try {
      const result = await addGoal(formData);
      if (result.ok) {
        setMessage({ ok: true, text: "Target disimpan." });
        formRef.current?.reset();
        setTarget("");
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "Koneksi gagal. Coba lagi." });
    } finally {
      setPending(false);
    }
  }

  const unit = kind === "weekly_runs" ? "lari" : "km";

  return (
    <form ref={formRef} action={onSubmit} className="card flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-lg font-bold">Tambah target</h2>

      <fieldset>
        <legend className="mb-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Jenis target
        </legend>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k}
              className={`pill min-h-[40px] cursor-pointer px-4 font-medium ${kind === k ? "" : "tone-neutral"}`}
              style={kind === k ? { background: "var(--pink)", color: "var(--on-color)" } : undefined}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {GOAL_KIND_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === "race" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Nama race (opsional)
          </span>
          <input name="name" maxLength={60} placeholder="Jakarta 10K" className="field" />
        </label>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {kind === "race" ? "Jarak race (km)" : `Target (${unit})`}
          </span>
          <input
            name="target"
            inputMode="decimal"
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={kind === "weekly_runs" ? "3" : kind === "race" ? "10" : "20"}
            className="field"
          />
          {kind === "race" && (
            <span className="flex flex-wrap gap-1.5 pt-1">
              {RACE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setTarget(String(p.km))}
                  className="pill tone-blue min-h-[32px] px-3"
                >
                  {p.label}
                </button>
              ))}
            </span>
          )}
        </label>

        {kind === "race" && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Target waktu (j:mm:dd atau mm:dd)
              </span>
              <input name="targetTime" required placeholder="1:05:00" className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Tanggal race
              </span>
              <input name="raceDate" type="date" required className="field [color-scheme:dark]" />
            </label>
          </>
        )}
      </div>

      {kind !== "race" && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Satu target per jenis: target baru menggantikan yang lama.
          {kind === "weekly_km" && " Target jarak mingguan juga dipakai di dashboard saat tidak ada program aktif."}
        </p>
      )}

      {message && (
        <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm ${message.ok ? "tone-blue" : "tone-pink"}`}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={pending || !storageReady} className="btn-primary gap-2">
        <Icon name="plus" size={18} />
        {pending ? "Menyimpan…" : "Simpan target"}
      </button>
      {!storageReady && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Hubungkan Upstash Redis untuk menyimpan target.
        </p>
      )}
    </form>
  );
}

export function DeleteGoalButton({ goalId, label }: { goalId: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(`Hapus target "${label}"?`)) return;
    setPending(true);
    setError(null);
    try {
      const result = await deleteGoal(goalId);
      if (!result.ok) setError(result.error);
    } catch {
      setError("Koneksi gagal.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Hapus target ${label}`}
        title="Hapus target"
        className="icon-button h-10 w-10 tone-neutral disabled:opacity-50"
      >
        <Icon name="trash" size={18} />
      </button>
      {error && (
        <span className="mt-1 text-[11px]" style={{ color: "var(--pink-text)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
