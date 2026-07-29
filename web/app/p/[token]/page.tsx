import Link from "next/link";
import { ContentBlockBody } from "@/components/content-block-body";
import {
  memberDisplayName,
  type PlanDeliverySnapshot,
  type SnapshotDay,
} from "@/lib/plans/delivery-snapshot";
import {
  recordDeliveryOpen,
  resolveDeliveryToken,
} from "@/lib/plans/delivery-tokens";

type Props = { params: Promise<{ token: string }> };

function DayCard({ day }: { day: SnapshotDay }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <h3 className="font-heading text-lg text-[var(--brand-workout)]">{day.label}</h3>
      {day.muscleGroup && (
        <p className="mt-0.5 text-xs text-white/50">{day.muscleGroup}</p>
      )}
      <div className="mt-3 space-y-4">
        {day.sections.map((section, si) => (
          <div key={si}>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
              {section.type}
            </p>
            {section.restNote && (
              <p className="mt-0.5 text-xs text-white/50">{section.restNote}</p>
            )}
            <ul className="mt-2 space-y-2">
              {section.exercises.map((ex, ei) => (
                <li
                  key={ei}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div>
                    {ex.supersetGroup && (
                      <span className="mr-1 text-xs text-[var(--brand-workout)]">
                        [{ex.supersetGroup}]
                      </span>
                    )}
                    <span>{ex.name}</span>
                  </div>
                  <span className="shrink-0 text-white/50">
                    {ex.sets ?? "—"} × {ex.reps ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--brand-dark)] px-6 text-white">
      <h1 className="font-heading text-xl">{title}</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-white/60">{detail}</p>
      <Link href="/login" className="mt-6 text-sm text-[var(--brand-workout)]">
        Sign in
      </Link>
    </div>
  );
}

export default async function PublicPlanViewerPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveDeliveryToken(token);

  if (!resolved.ok) {
    if (resolved.reason === "not_found") {
      return (
        <ErrorState
          title="Plan not found"
          detail="This link is invalid or has been removed."
        />
      );
    }
    if (resolved.reason === "revoked") {
      return (
        <ErrorState
          title="Link revoked"
          detail="Your coach revoked this plan link. Ask them to send a new one."
        />
      );
    }
    return (
      <ErrorState
        title="Link expired"
        detail="This plan link has expired. Ask your coach to send an updated plan."
      />
    );
  }

  await recordDeliveryOpen(resolved.delivery.id);
  const snapshot = resolved.delivery.snapshot as PlanDeliverySnapshot;
  const brand = snapshot.branding.name ?? "Coach Platform";
  const name = memberDisplayName(snapshot);
  const voiceUrl = resolved.delivery.coachVoiceNoteUrl;

  return (
    <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
      <header className="border-b border-white/10 px-4 py-5">
        <p className="text-xs uppercase tracking-wide text-white/40">{brand}</p>
        <h1 className="mt-1 font-heading text-2xl">{snapshot.weekLabel}</h1>
        <p className="mt-1 text-sm text-white/60">
          For {name}
          {snapshot.coach.displayName
            ? ` · Coach ${snapshot.coach.displayName}`
            : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`/p/${token}/plan.pdf`}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Download PDF
          </a>
          <Link
            href={`/login?next=${encodeURIComponent("/member/workouts")}`}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80"
          >
            Sign in to log workouts
          </Link>
        </div>
        {voiceUrl && (
          <div className="mt-4 rounded-xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Voice from your coach</p>
            <audio controls className="mt-3 w-full" src={voiceUrl}>
              <track kind="captions" />
            </audio>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        {snapshot.training && (
          <section className="space-y-3">
            <h2 className="font-heading text-sm text-[var(--brand-workout)]">
              Training · Week {snapshot.training.weekNumber}
              {snapshot.training.stepGoal
                ? ` · ${snapshot.training.stepGoal.toLocaleString()} steps`
                : ""}
            </h2>
            {snapshot.training.blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
              >
                <h3 className="font-medium">{block.title}</h3>
                <div className="mt-2">
                  <ContentBlockBody
                    bodyJson={
                      block.bodyJson as {
                        items?: string[];
                        categories?: Record<string, string[]>;
                        template?: string;
                      }
                    }
                  />
                </div>
              </div>
            ))}
            {snapshot.training.days.map((day) => (
              <DayCard key={day.dayIndex} day={day} />
            ))}
          </section>
        )}

        {snapshot.nutrition && (
          <section className="space-y-3">
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">
              Nutrition · Week {snapshot.nutrition.weekNumber}
            </h2>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm sm:grid-cols-4">
              <Macro
                label="Calories"
                value={range(
                  snapshot.nutrition.caloriesMin,
                  snapshot.nutrition.caloriesMax,
                )}
              />
              <Macro
                label="Protein"
                value={range(
                  snapshot.nutrition.proteinMin,
                  snapshot.nutrition.proteinMax,
                  "g",
                )}
              />
              <Macro
                label="Carbs"
                value={range(null, snapshot.nutrition.carbsMax, "g")}
              />
              <Macro
                label="Fat"
                value={range(
                  snapshot.nutrition.fatMin,
                  snapshot.nutrition.fatMax,
                  "g",
                )}
              />
            </div>
            {snapshot.nutrition.blocks.map((block) => (
              <div
                key={block.id}
                className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
              >
                <h3 className="font-medium">{block.title}</h3>
                <p className="mt-0.5 text-xs uppercase text-white/40">
                  {block.category.replace(/_/g, " ")}
                </p>
                <div className="mt-2">
                  <ContentBlockBody
                    bodyJson={
                      block.bodyJson as {
                        items?: string[];
                        categories?: Record<string, string[]>;
                        template?: string;
                      }
                    }
                  />
                </div>
              </div>
            ))}
            <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Sign in to log meals and track macros in the app.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function range(min: number | null, max: number | null, unit = ""): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${min}–${max}${unit}`;
  if (min != null) return `${min}+${unit}`;
  return `≤${max}${unit}`;
}
