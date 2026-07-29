import { memberCopy } from "@/lib/copy/member-portal";

function isEmbeddableVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function CoachBroadcastCard({
  body,
  audioUrl,
  videoUrl,
}: {
  body: string;
  audioUrl: string | null;
  videoUrl?: string | null;
}) {
  if (!body.trim() && !audioUrl && !videoUrl) return null;

  return (
    <section className="dashboard-hero rounded-2xl border border-[var(--brand-primary)]/30 p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--brand-diet)]">
        {memberCopy.coachNoteLabel}
      </p>
      {body.trim() ? (
        <p className="mt-2 text-sm leading-relaxed text-white/85">{body}</p>
      ) : null}
      {videoUrl ? (
        isEmbeddableVideoUrl(videoUrl) ? (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-[var(--brand-diet)] underline"
          >
            Watch coach video
          </a>
        ) : (
          <video controls className="mt-3 max-h-64 w-full rounded-lg" src={videoUrl}>
            <track kind="captions" />
          </video>
        )
      ) : null}
      {audioUrl && (
        <audio controls className="mt-3 w-full" src={audioUrl}>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
}
