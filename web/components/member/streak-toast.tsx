"use client";

import { useEffect, useState } from "react";

export function StreakToast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible || !message) return null;

  return (
    <div
      role="status"
      className="streak-toast fixed bottom-24 left-1/2 z-40 max-w-xs -translate-x-1/2 rounded-xl border border-[var(--brand-diet)]/40 bg-[var(--brand-dark-surface)] px-4 py-3 text-center text-sm shadow-lg"
    >
      {message}
    </div>
  );
}
