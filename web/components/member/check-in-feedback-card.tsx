import { memberCopy } from "@/lib/copy/member-portal";

export type CheckInFeedback = {
  id: string;
  status: string;
  coachNote: string | null;
  coachVoiceNoteUrl: string | null;
  createdAt: string;
};

export function CheckInFeedbackCard({ feedback }: { feedback: CheckInFeedback }) {
  const dateLabel = new Date(feedback.createdAt).toLocaleDateString();
  const hasNote = Boolean(feedback.coachNote?.trim());
  const hasVoice = Boolean(feedback.coachVoiceNoteUrl?.trim());

  if (!hasNote && !hasVoice) return null;

  return (
    <section className="rounded-2xl border border-[var(--brand-diet)]/40 bg-[var(--brand-diet)]/10 p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--brand-diet)]">
        {memberCopy.checkInFeedbackLabel}
      </p>
      <p className="mt-1 text-xs text-white/50">
        {memberCopy.checkInFeedbackDate(dateLabel)}
        {feedback.status === "pending" ? ` · ${memberCopy.checkInFeedbackPending}` : null}
      </p>
      {hasNote ? (
        <p className="mt-2 text-sm leading-relaxed text-white/85">{feedback.coachNote}</p>
      ) : null}
      {hasVoice ? (
        <audio controls className="mt-3 w-full" src={feedback.coachVoiceNoteUrl!}>
          <track kind="captions" />
        </audio>
      ) : null}
    </section>
  );
}
