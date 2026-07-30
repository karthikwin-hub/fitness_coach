"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthHeaders, useAuthReady, authFetch } from "@/lib/api/client";
import { CoachPageShell } from "@/components/coach/coach-page-shell";
import { CoachBroadcastPanel } from "@/components/coach/coach-broadcast-panel";
import { CheckInHistoryList } from "@/components/coach/check-in-history-list";
import {
  VoiceNoteRecorder,
  type VoiceNoteRecorderHandle,
} from "@/components/coach/voice-note-recorder";
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
  coachVoiceNoteUrl: string | null;
  coachVoiceNoteDurationSec: number | null;
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
  const authReady = useAuthReady();
  const getHeaders = useAuthHeaders();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [trendsByMember, setTrendsByMember] = useState<Record<string, MemberTrendSnapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [coachNoteDraft, setCoachNoteDraft] = useState("");
  const [voiceNote, setVoiceNote] = useState<{
    url: string;
    durationSec: number;
  } | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(
    () => searchParams.get("memberId"),
  );
  const [memberOptions, setMemberOptions] = useState<Array<[string, string]>>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const voiceRecorderRef = useRef<VoiceNoteRecorderHandle>(null);

  const loadCheckIns = useCallback(async (): Promise<CheckIn[] | null> => {
    const url = memberFilter
      ? `/api/check-ins?memberId=${memberFilter}`
      : "/api/check-ins";
    try {
      const headers = await getHeaders();
      if (!headers.Authorization) return null;

      const res = await authFetch(url, {}, getHeaders);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 401) {
          setLoadError("Session expired — sign out and sign in again.");
        } else {
          setLoadError(data.error ?? coachCopy.loadError);
        }
        return null;
      }
      const payload: CheckInsResponse = await res.json();
      const items = payload.items ?? [];
      setTrendsByMember(payload.trendsByMember ?? {});
      setLoadError(null);
      setCheckIns(items);
      return items;
    } catch {
      setLoadError("Could not reach the server. Try refreshing or restart start-local.bat.");
      return null;
    }
  }, [getHeaders, memberFilter]);

  useEffect(() => {
    if (!authReady) return;
    void loadCheckIns().then((items) => {
      if (!items) return;
      setSelectedId((prev) => {
        if (prev && items.some((c) => c.id === prev)) return prev;
        const nextPending = items.find(
          (c) => c.status === "pending" || c.status === "flagged",
        );
        return nextPending?.id ?? items[0]?.id ?? null;
      });
    });
  }, [authReady, loadCheckIns]);

  useEffect(() => {
    if (!authReady) return;
    void (async () => {
      const headers = await getHeaders();
      if (!headers.Authorization) return;
      try {
        const res = await authFetch("/api/members", {}, getHeaders);
        if (!res.ok) {
          setMemberOptions([]);
          return;
        }
        const rows = (await res.json()) as Array<{
          id: string;
          displayName: string | null;
          email: string;
        }>;
        setMemberOptions(rows.map((m) => [m.id, m.displayName ?? m.email] as [string, string]));
      } catch {
        setMemberOptions([]);
      }
    })();
  }, [authReady, getHeaders]);

  useEffect(() => {
    setMemberFilter(searchParams.get("memberId"));
  }, [searchParams]);

  const selected = checkIns.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    setCoachNoteDraft(selected?.coachNote ?? "");
    setVoiceNote(
      selected?.coachVoiceNoteUrl
        ? {
            url: selected.coachVoiceNoteUrl,
            durationSec: selected.coachVoiceNoteDurationSec ?? 0,
          }
        : null,
    );
    setNoteSaved(false);
    setSaveError(null);
  }, [
    selected?.id,
    selected?.coachNote,
    selected?.coachVoiceNoteUrl,
    selected?.coachVoiceNoteDurationSec,
  ]);

  const pending = checkIns.filter((c) => c.status === "pending" || c.status === "flagged");
  const listTitle = memberFilter
    ? coachCopy.queueTitleHistory(checkIns.length)
    : coachCopy.queueTitlePending(pending.length);

  async function resolveVoiceForSave() {
    const finalized = await voiceRecorderRef.current?.finalizeForSave();
    if (finalized) {
      setVoiceNote(finalized);
      return finalized;
    }
    return voiceNote;
  }

  async function patchCheckIn(body: {
    status?: string;
    coachNote?: string | null;
    coachVoiceNoteUrl?: string | null;
    coachVoiceNoteDurationSec?: number | null;
  }) {
    if (!selected) return null;
    const res = await authFetch(`/api/check-ins/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, getHeaders);
    const updated = (await res.json()) as CheckIn & { error?: string };
    if (!res.ok) {
      setSaveError(updated.error ?? "Could not save check-in feedback.");
      return null;
    }
    setSaveError(null);
    setCheckIns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    const items = await loadCheckIns();
    return items ? { updated, items } : { updated, items: [] as CheckIn[] };
  }

  function selectNextPending(
    items: CheckIn[],
    afterId: string,
  ): string | null {
    const next = items.find(
      (c) =>
        c.id !== afterId &&
        (c.status === "pending" || c.status === "flagged"),
    );
    return next?.id ?? null;
  }

  async function saveNote() {
    if (!selected) return;
    setSavingNote(true);
    setSaveError(null);
    setActionBanner(null);
    const voice = await resolveVoiceForSave();
    const result = await patchCheckIn({
      coachNote: coachNoteDraft || null,
      coachVoiceNoteUrl: voice?.url ?? null,
      coachVoiceNoteDurationSec: voice?.durationSec ?? null,
    });
    setSavingNote(false);
    if (result) setNoteSaved(true);
  }

  async function review(status: "approved" | "flagged") {
    if (!selected) return;
    const memberName = selected.memberDisplayName ?? selected.memberEmail;
    const reviewedId = selected.id;
    setSaveError(null);
    setActionBanner(null);
    const voice = await resolveVoiceForSave();
    const result = await patchCheckIn({
      status,
      coachNote: coachNoteDraft || null,
      coachVoiceNoteUrl: voice?.url ?? null,
      coachVoiceNoteDurationSec: voice?.durationSec ?? null,
    });
    if (!result) return;

    if (status === "approved") {
      setActionBanner(coachCopy.checkInApproved(memberName));
      const nextId = selectNextPending(result.items, reviewedId);
      setSelectedId(nextId);
      if (!nextId) {
        setActionBanner(
          memberFilter
            ? coachCopy.memberCheckInsCaughtUp(memberName)
            : coachCopy.queueAllCaughtUp,
        );
      }
    } else {
      setActionBanner(coachCopy.checkInFlagged(memberName));
    }
    setNoteSaved(false);
  }

  const isApproved = selected?.status === "approved";
  const isFlagged = selected?.status === "flagged";
  const feedbackLocked = isApproved;

  const displayList = memberFilter
    ? checkIns
    : pending.length > 0
      ? pending
      : checkIns.slice(0, 10);

  const emptyMessage = memberFilter
    ? coachCopy.queueEmptyFiltered
    : coachCopy.queueEmpty;

  function handleSelectCheckIn(id: string) {
    setSelectedId(id);
    setActionBanner(null);
  }

  return (
    <CoachPageShell
      eyebrow={coachCopy.commandCenterSubtitle}
      title={coachCopy.commandCenterTitle}
      maxWidth="6xl"
    >
      <CoachBroadcastPanel />
      <div className="grid gap-6 lg:grid-cols-3">
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
              onSelect={handleSelectCheckIn}
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
          {actionBanner && (
            <p className="mb-4 rounded-lg border border-[var(--brand-diet)]/40 bg-[var(--brand-diet)]/15 px-3 py-2 text-sm text-[var(--brand-diet)]">
              {actionBanner}
            </p>
          )}
          <h2 className="font-heading text-sm">AI review</h2>
          {selected ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-white/40">
                  {selected.memberDisplayName ?? selected.memberEmail}
                  {" · "}
                  {new Date(selected.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
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
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isApproved
                      ? "bg-[var(--brand-diet)]/20 text-[var(--brand-diet)]"
                      : isFlagged
                        ? "bg-red-500/20 text-red-300"
                        : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  {selected.status}
                </span>
              </div>
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
                {feedbackLocked && (
                  <p className="mb-2 text-xs text-[var(--brand-diet)]">
                    {coachCopy.checkInAlreadyApproved}
                  </p>
                )}
                <label className="text-xs text-white/50">Coach note to member</label>
                <textarea
                  value={coachNoteDraft}
                  onChange={(e) => {
                    setCoachNoteDraft(e.target.value);
                    setNoteSaved(false);
                  }}
                  rows={3}
                  readOnly={feedbackLocked}
                  placeholder="Feedback visible on the member dashboard after you save…"
                  className="mt-2 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm disabled:opacity-80"
                />
                <div className="mt-3">
                  <VoiceNoteRecorder
                    key={selected.id}
                    ref={voiceRecorderRef}
                    memberId={selected.memberId}
                    attached={voiceNote}
                    onAttach={(url, durationSec) => {
                      setVoiceNote({ url, durationSec });
                      setNoteSaved(false);
                    }}
                    onClear={() => {
                      setVoiceNote(null);
                      setNoteSaved(false);
                    }}
                    disabled={savingNote || feedbackLocked}
                    label="Voice feedback for member"
                  />
                </div>
                {!feedbackLocked && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={savingNote}
                      onClick={saveNote}
                      className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {savingNote ? "Saving…" : "Save draft"}
                    </button>
                    {noteSaved && (
                      <span className="text-xs text-[var(--brand-diet)]">{coachCopy.noteSaved}</span>
                    )}
                    {saveError && (
                      <span className="text-xs text-amber-300">{saveError}</span>
                    )}
                  </div>
                )}
              </div>

              {!feedbackLocked ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <ApproveButton onApprove={() => review("approved")} />
                  <button
                    type="button"
                    onClick={() => review("flagged")}
                    className="tap-target rounded-xl border border-red-400/50 px-6 py-3 text-sm text-red-300"
                  >
                    Flag for follow-up
                  </button>
                  {(isFlagged ||
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
              ) : (
                <p className="mt-6 text-sm text-white/50">
                  This check-in is complete. Pick another item from the queue, or filter by member to review history.
                </p>
              )}
              <p className="mt-3 text-xs text-white/40">{coachCopy.approveHint}</p>
            </>
          ) : (
            <p className="mt-4 text-sm text-white/50">
              {actionBanner ?? coachCopy.queueAllCaughtUp}
            </p>
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
    </CoachPageShell>
  );
}

