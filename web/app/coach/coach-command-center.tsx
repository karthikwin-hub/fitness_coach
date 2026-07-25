"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CheckInHistoryList } from "@/components/coach/check-in-history-list";
import { ApproveButton } from "@/components/coach/approve-button";
import { RecipeSwapDrawer } from "@/components/coach/recipe-swap-drawer";
import { MemberDiarySummary } from "@/components/coach/member-diary-summary";
import { coachCopy } from "@/lib/copy/coach-portal";
import type { MemberTrendSnapshot } from "@/lib/coach/trend-alerts";

type CheckIn = {
  id: string;
  status: string;
  memberId: string;
  memberDisplayName: string | null;
  memberEmail: string;
  aiConfidence: number | null;
  aiAnalysisJson: { summary?: string; proteinG?: number; flags?: string[] } | null;
  mealPhotoUrl: string | null;
  weightKg: number | null;
  sleepHours: number | null;
  coachNote: string | null;
  createdAt: string;
};

type CheckInsResponse = {
  items: CheckIn[];
  trendsByMember: Record<string, MemberTrendSnapshot>;
};

function MealPhotoPanel({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-white/20 p-4 text-center text-xs text-white/40">
        <p>No meal photo on this check-in.</p>
        <p className="mt-2 max-w-xs">
          Members upload photos from{" "}
          <Link href="/member/check-in" className="text-[var(--brand-diet)] underline">
            Check-in
          </Link>{" "}
          when submitting their daily log.
        </p>
      </div>
    );
  }

  if (url.startsWith("http") || url.startsWith("data:image")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Member meal"
        className="max-h-64 w-full rounded-lg border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-white/20 p-4 text-center text-xs text-white/40">
      <p>Photo stub only — no image stored.</p>
    </div>
  );
}

export function CoachCommandCenter() {
  const searchParams = useSearchParams();
  const getHeaders = useAuthHeaders();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [trendsByMember, setTrendsByMember] = useState<Record<string, MemberTrendSnapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [memberFilter, setMemberFilter] = useState<string | null>(
    () => searchParams.get("memberId"),
  );
  const [memberOptions, setMemberOptions] = useState<Array<[string, string]>>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const loadCheckIns = useCallback(async () => {
    const url = memberFilter
      ? `/api/check-ins?memberId=${memberFilter}`
      : "/api/check-ins";
    try {
      const res = await authFetch(url, {}, getHeaders);
      if (!res.ok) {
        setLoadError(coachCopy.loadError);
        return;
      }
      const payload: CheckInsResponse = await res.json();
      const items = payload.items ?? [];
      setTrendsByMember(payload.trendsByMember ?? {});
      setLoadError(null);
      setCheckIns(items);
      setSelectedId((prev) => {
        if (prev && items.some((c) => c.id === prev)) return prev;
        return items[0]?.id ?? null;
      });
    } catch {
      setLoadError("Could not reach the server. Try refreshing or restart start-local.bat.");
    }
  }, [getHeaders, memberFilter]);

  useEffect(() => {
    loadCheckIns();
  }, [loadCheckIns]);

  useEffect(() => {
    void authFetch("/api/members", {}, getHeaders)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ id: string; displayName: string | null; email: string }>) => {
        setMemberOptions(rows.map((m) => [m.id, m.displayName ?? m.email] as [string, string]));
      })
      .catch(() => setMemberOptions([]));
  }, [getHeaders]);

  useEffect(() => {
    setMemberFilter(searchParams.get("memberId"));
  }, [searchParams]);

  const selected = checkIns.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setCoachNoteDraft(selected?.coachNote ?? "");
    setNoteSaved(false);
  }, [selected?.id, selected?.coachNote]);

  const pending = checkIns.filter((c) => c.status === "pending" || c.status === "flagged");
  const listTitle = memberFilter
    ? coachCopy.queueTitleHistory(checkIns.length)
    : coachCopy.queueTitlePending(pending.length);

  async function patchCheckIn(body: { status?: string; coachNote?: string | null }) {
    if (!selected) return null;
    const updated: CheckIn = await authFetch(`/api/check-ins/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, getHeaders).then((r) => r.json());
    setCheckIns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedId(updated.id);
    await loadCheckIns();
    return updated;
  }

  async function saveNote() {
    if (!selected) return;
    setSavingNote(true);
    await patchCheckIn({ coachNote: coachNoteDraft || null });
    setSavingNote(false);
    setNoteSaved(true);
  }

  async function review(status: "approved" | "flagged") {
    if (!selected) return;
    await patchCheckIn({ status, coachNote: coachNoteDraft || null });
    setNoteSaved(true);
  }

  const displayList = memberFilter
    ? checkIns
    : pending.length > 0
      ? pending
      : checkIns.slice(0, 10);

  const emptyMessage = memberFilter
    ? coachCopy.queueEmptyFiltered
    : coachCopy.queueEmpty;

  return (
    <div className="coach-atmosphere min-h-dvh text-white">
      <header className="border-b border-white/10 px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs text-[var(--brand-workout)]">{coachCopy.commandCenterSubtitle}</p>
            <h1 className="font-display text-xl">{coachCopy.commandCenterTitle}</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-4 text-sm">
            <Link href="/coach/members" className="text-white/70">
              Members
            </Link>
            <Link href="/coach/plans" className="text-[var(--brand-diet)]">
              Plan delivery
            </Link>
            <Link href="/coach/settings" className="text-white/70">
              Settings
            </Link>
            <SignOutButton className="text-white/50 hover:text-white/80" />
            <Link href="/login?switch=1" className="text-white/50">
              Switch persona
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-sm text-white/70">{listTitle}</h2>
          </div>
          <div className="mt-3">
            <label className="text-xs text-white/40">Filter by member</label>
            <select
              value={memberFilter ?? ""}
              onChange={(e) => setMemberFilter(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
            >
              <option value="">All members (recent)</option>
              {memberOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 max-h-[32rem] overflow-y-auto">
            {loadError && (
              <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                {loadError}
              </p>
            )}
            <CheckInHistoryList
              items={displayList}
              selectedId={selectedId}
              onSelect={setSelectedId}
              showMemberName={!memberFilter}
              emptyMessage={emptyMessage}
              trendsByMember={trendsByMember}
            />
          </div>
          {memberFilter && (
            <Link
              href={`/coach/members/${memberFilter}`}
              className="mt-3 inline-block text-xs text-[var(--brand-workout)] hover:underline"
            >
              Open member profile →
            </Link>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 lg:col-span-2">
          <h2 className="font-heading text-sm">AI review</h2>
          {selected ? (
            <>
              <p className="mt-1 text-xs text-white/40">
                {selected.memberDisplayName ?? selected.memberEmail}
                {" · "}
                <Link
                  href={`/coach/members/${selected.memberId}`}
                  className="text-[var(--brand-workout)] underline"
                >
                  Profile
                </Link>
                {" · "}
                <Link
                  href={`/coach?memberId=${selected.memberId}`}
                  className="text-[var(--brand-workout)] underline"
                >
                  Full history
                </Link>
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <MealPhotoPanel url={selected.mealPhotoUrl} />
                <div className="rounded-lg border border-white/10 p-4 text-sm text-white/70">
                  <p>{selected.aiAnalysisJson?.summary ?? "No AI analysis yet."}</p>
                  {selected.aiAnalysisJson?.proteinG != null && (
                    <p className="mt-2">Protein: {selected.aiAnalysisJson.proteinG}g</p>
                  )}
                  {selected.aiAnalysisJson?.flags?.map((f) => (
                    <p key={f} className="mt-1 text-amber-300">{f}</p>
                  ))}
                  {selected.aiConfidence != null && (
                    <p className="mt-2 text-xs text-white/40">
                      AI confidence {Math.round(selected.aiConfidence * 100)}%
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <MemberDiarySummary memberId={selected.memberId} />
              </div>

              <div className="mt-6">
                <label className="text-xs text-white/50">Coach note to member</label>
                <textarea
                  value={coachNoteDraft}
                  onChange={(e) => {
                    setCoachNoteDraft(e.target.value);
                    setNoteSaved(false);
                  }}
                  rows={3}
                  placeholder="Feedback visible on the member dashboard after you save…"
                  className="mt-2 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={savingNote}
                    onClick={saveNote}
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {savingNote ? "Saving…" : "Save note"}
                  </button>
                  {noteSaved && (
                    <span className="text-xs text-[var(--brand-diet)]">{coachCopy.noteSaved}</span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ApproveButton onApprove={() => review("approved")} />
                <button
                  type="button"
                  onClick={() => review("flagged")}
                  className="tap-target rounded-xl border border-red-400/50 px-6 py-3 text-sm text-red-300"
                >
                  Flag for follow-up
                </button>
                {(selected.status === "flagged" ||
                  (trendsByMember[selected.memberId]?.alerts.length ?? 0) > 0) && (
                  <button
                    type="button"
                    onClick={() => setRecipeOpen(true)}
                    className="tap-target rounded-xl border border-[var(--brand-diet)]/50 px-6 py-3 text-sm text-[var(--brand-diet)]"
                  >
                    Quick-fix recipes
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-white/40">{coachCopy.approveHint}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-white/50">Select a check-in to review.</p>
          )}
        </section>
      </div>

      {selected && (
        <RecipeSwapDrawer
          open={recipeOpen}
          onClose={() => setRecipeOpen(false)}
          memberName={selected.memberDisplayName ?? selected.memberEmail}
          onSelect={(recipe) => {
            const suggestion = `Try: ${recipe.name} (${recipe.proteinG}g protein). ${recipe.note ?? ""}`.trim();
            setCoachNoteDraft((prev) => (prev ? `${prev}\n\n${suggestion}` : suggestion));
            setRecipeOpen(false);
            setNoteSaved(false);
          }}
        />
      )}
    </div>
  );
}
