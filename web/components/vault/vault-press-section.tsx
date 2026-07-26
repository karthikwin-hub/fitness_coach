import type { VaultCatalogMarketing } from "@/lib/vault/types";

export function VaultPressSection({
  pressFeatures,
}: {
  pressFeatures: VaultCatalogMarketing["pressFeatures"];
}) {
  if (pressFeatures.length === 0) return null;

  return (
    <section className="border-b border-white/10 bg-white/[0.02] px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-center text-sm uppercase tracking-widest text-white/50">
          Featured in
        </h2>
        <div className="mt-6 flex flex-wrap items-stretch justify-center gap-3">
          {pressFeatures.map((item) => (
            <div
              key={item.outlet}
              className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-center"
            >
              <p className="text-xs font-semibold text-white/80">{item.outlet}</p>
              <p className="mt-1 max-w-[200px] text-[10px] text-white/40">{item.headline}</p>
              {item.year && (
                <p className="mt-1 text-[10px] text-white/30">{item.year}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
