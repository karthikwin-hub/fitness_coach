"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import type {
  JourneyItemDetail,
  JourneyItemKind,
} from "@/lib/members/journey-item-detail";

type Props = {
  mode: "coach" | "member";
  memberId?: string;
  kind: JourneyItemKind;
  itemId: string;
  onClose: () => void;
};

export function JourneyItemDetailPanel({
  mode,
  memberId,
  kind,
  itemId,
  onClose,
}: Props) {
  const getHeaders = useAuthHeaders();
  const [detail, setDetail] = useState<JourneyItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const path =
      mode === "member"
        ? `/api/members/me/journey/items/${kind}/${itemId}`
        : `/api/members/${memberId}/journey/items/${kind}/${itemId}`;

    const { data, error: err } = await authFetchJson<JourneyItemDetail>(path, {}, getHeaders);
    if (err) {
      setError(err);
      setDetail(null);
    } else {
      setDetail(data);
    }
    setLoading(false);
  }, [getHeaders, itemId, kind, memberId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close detail"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[var(--brand-dark-surface)] shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">{kind.replace("-", " ")}</p>
            <h2 className="font-heading text-lg text-white">
              {detail?.title ?? "Loading…"}
            </h2>
            {detail?.subtitle && (
              <p className="text-sm text-white/50">{detail.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-2 py-1 text-sm text-white/70 hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && <p className="text-sm text-white/50">Loading details…</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
          {detail && (
            <div className="space-y-6">
              {detail.status && (
                <p className="text-xs uppercase text-[var(--brand-diet)]">{detail.status}</p>
              )}

              {detail.planned.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h3 className="font-heading text-sm text-[var(--brand-workout)]">
                    {section.heading}
                  </h3>
                  {section.lines.length === 0 ? (
                    <p className="text-sm text-white/40">Nothing recorded.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-white/80">
                      {section.lines.map((line, i) => (
                        <li key={`${section.heading}-${i}`} className="rounded-lg bg-black/20 px-3 py-2">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              <section className="space-y-2">
                <h3 className="font-heading text-sm text-[var(--brand-diet)]">Communication</h3>
                {detail.communications.length === 0 ? (
                  <p className="text-sm text-white/40">
                    No coach notes or messages linked to this item yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.communications.map((c, i) => (
                      <li
                        key={`${c.label}-${i}`}
                        className={`rounded-xl border px-3 py-3 text-sm ${
                          c.role === "coach"
                            ? "border-[var(--brand-diet)]/30 bg-[var(--brand-diet)]/10"
                            : c.role === "member"
                              ? "border-white/15 bg-black/20"
                              : "border-white/10 bg-black/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-white/60">{c.label}</span>
                          {c.at && (
                            <span className="text-xs text-white/35">
                              {c.at.slice(0, 10)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-white/85">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type JourneyItemSelection = {
  kind: JourneyItemKind;
  id: string;
};
