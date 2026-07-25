"use client";

type CalComEmbedProps = {
  className?: string;
};

function calEmbedUrl(raw: string): string {
  const base = raw.trim() || "https://cal.com";
  try {
    const url = new URL(base);
    url.searchParams.set("embed", "true");
    return url.toString();
  } catch {
    return "https://cal.com?embed=true";
  }
}

export function CalComEmbed({ className }: CalComEmbedProps) {
  const src = calEmbedUrl(process.env.NEXT_PUBLIC_CAL_COM_URL ?? "https://cal.com");

  return (
    <iframe
      title="Book with Coach Helna"
      src={src}
      className={className ?? "h-[min(70dvh,640px)] w-full rounded-xl border border-white/10 bg-white"}
      allow="payment"
    />
  );
}
