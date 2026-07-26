import type { VaultCatalogMarketing } from "@/lib/vault/types";

export function VaultWhyChooseSection({
  whyChoose,
}: {
  whyChoose: VaultCatalogMarketing["whyChoose"];
}) {
  if (whyChoose.length === 0) return null;

  return (
    <section className="border-b border-white/10 px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-heading text-lg text-white/80">Why these programs?</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Built for real schedules — nutrition-first, home-friendly, and designed for
          professionals who want results without 1-on-1 coaching calls.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {whyChoose.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/10 p-4"
            >
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <p className="mt-2 font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm text-white/50">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
