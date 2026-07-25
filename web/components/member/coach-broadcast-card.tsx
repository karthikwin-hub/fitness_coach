import { memberCopy } from "@/lib/copy/member-portal";

export function CoachBroadcastCard({
  body,
  audioUrl,
}: {
  body: string;
  audioUrl: string | null;
}) {
  if (!body.trim()) return null;

  return (
    <section className="dashboard-hero rounded-2xl border border-[var(--brand-primary)]/30 p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--brand-diet)]">
        {memberCopy.coachNoteLabel}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{body}</p>
      {audioUrl && (
        <audio controls className="mt-3 w-full" src={audioUrl}>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
}
