import type { VaultCatalogMarketing } from "@/lib/vault/types";

export function VaultCoachStorySection({
  coachStory,
}: {
  coachStory: VaultCatalogMarketing["coachStory"];
}) {
  return (
    <section className="border-t border-white/10 bg-white/[0.02] px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-lg">{coachStory.title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-white/70">{coachStory.body}</p>
        {coachStory.credentials && coachStory.credentials.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-white/50">
            {coachStory.credentials.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-[var(--brand-diet)]">✓</span>
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
