"use client";

import { useMemo, useState } from "react";
import { memberCopy } from "@/lib/copy/member-portal";

const INITIAL_VISIBLE = 3;
const PAGE_SIZE = 5;

export type CoachFeedbackItem = {
  id: string;
  status: string;
  coachNote: string | null;
  coachVoiceNoteUrl: string | null;
  createdAt: string;
  weightKg: number | null;
  sleepHours: number | null;
};

function FeedbackRow({ item }: { item: CoachFeedbackItem }) {
  return (
    <li className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-white/70">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs uppercase ${
            item.status === "approved"
              ? "bg-[var(--brand-diet)]/20 text-[var(--brand-diet)]"
              : item.status === "flagged"
                ? "bg-red-500/20 text-red-300"
                : "bg-white/10 text-white/60"
          }`}
        >
          {item.status}
        </span>
      </div>
      {(item.weightKg != null || item.sleepHours != null) && (
        <p className="mt-1 text-xs text-white/50">
          {item.weightKg != null && `${item.weightKg}kg`}
          {item.weightKg != null && item.sleepHours != null && " · "}
          {item.sleepHours != null && `${item.sleepHours}h sleep`}
        </p>
      )}
      {item.coachNote ? (
        <p className="mt-2 text-sm text-white/80">{item.coachNote}</p>
      ) : item.status === "approved" ? (
        <p className="mt-2 text-sm text-white/50">Approved — keep it up!</p>
      ) : item.status === "flagged" ? (
        <p className="mt-2 text-sm text-amber-200">Flagged — coach will follow up</p>
      ) : null}
      {item.coachVoiceNoteUrl && (
        <audio controls className="mt-2 w-full" src={item.coachVoiceNoteUrl}>
          <track kind="captions" />
        </audio>
      )}
    </li>
  );
}

export function CoachFeedbackHistory({ items }: { items: CoachFeedbackItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const initialItems = useMemo(() => items.slice(0, INITIAL_VISIBLE), [items]);
  const olderItems = useMemo(() => items.slice(INITIAL_VISIBLE), [items]);
  const totalOlderPages = Math.max(1, Math.ceil(olderItems.length / PAGE_SIZE));
  const pagedOlderItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return olderItems.slice(start, start + PAGE_SIZE);
  }, [olderItems, page]);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 p-4">
      <h2 className="font-heading text-sm text-[var(--brand-diet)]">Previous check-in feedback</h2>
      <p className="mt-1 text-xs text-white/40">{memberCopy.coachFeedbackSectionHint}</p>

      <ul className="mt-4 space-y-3">
        {initialItems.map((item) => (
          <FeedbackRow key={item.id} item={item} />
        ))}
      </ul>

      {olderItems.length > 0 && (
        <div className="mt-3">
          {!expanded ? (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setPage(0);
              }}
              className="text-sm text-[var(--brand-diet)] underline-offset-2 hover:underline"
            >
              {memberCopy.coachFeedbackShowOlder(olderItems.length)}
            </button>
          ) : (
            <>
              <ul className="space-y-3 border-t border-white/10 pt-3">
                {pagedOlderItems.map((item) => (
                  <FeedbackRow key={item.id} item={item} />
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-white/45">
                  {memberCopy.coachFeedbackPage(page + 1, totalOlderPages)}
                </span>
                <button
                  type="button"
                  disabled={page >= totalOlderPages - 1}
                  onClick={() => setPage((p) => Math.min(totalOlderPages - 1, p + 1))}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setPage(0);
                }}
                className="mt-2 text-xs text-white/40 underline-offset-2 hover:underline"
              >
                {memberCopy.coachFeedbackCollapse}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
