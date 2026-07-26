"use client";

import { useCallback, useState } from "react";
import { useAuthHeaders } from "@/lib/api/client";

export function PlanPdfDownloadButton({
  className,
  label = "Download plan PDF",
}: {
  className?: string;
  label?: string;
}) {
  const getHeaders = useAuthHeaders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/members/me/plan-pdf", { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "No delivered plan yet");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plan.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }, [getHeaders]);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className={
          className ??
          "rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80 disabled:opacity-50"
        }
      >
        {busy ? "Preparing…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-amber-200">{error}</p>}
    </div>
  );
}
