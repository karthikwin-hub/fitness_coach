import type { VaultCatalogMarketing } from "@/lib/vault/types";

function StarRow({ rating = 5 }: { rating?: number }) {
  return (
    <span className="text-[var(--brand-workout)]" aria-label={`${rating} stars`}>
      {"★".repeat(rating)}
    </span>
  );
}

export function VaultTestimonialsSection({
  testimonials,
}: {
  testimonials: VaultCatalogMarketing["testimonials"];
}) {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-b border-white/10 px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-lg text-white/80">What members say</h2>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible">
          {testimonials.map((t) => (
            <blockquote
              key={`${t.name}-${t.location ?? ""}`}
              className="min-w-[280px] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:min-w-0"
            >
              <StarRow rating={t.rating} />
              <p className="mt-3 text-sm text-white/80">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-3 text-xs text-white/40">
                — {t.name}
                {t.location ? ` · ${t.location}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
