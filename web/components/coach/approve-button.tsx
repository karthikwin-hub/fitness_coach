"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MotionButton = dynamic(
  () => import("./approve-button-motion").then((m) => m.ApproveButtonMotion),
  { ssr: false, loading: () => <ApproveButtonFallback /> },
);

function ApproveButtonFallback() {
  return (
    <button
      type="button"
      className="tap-target rounded-xl bg-[var(--brand-diet)] px-6 py-3 text-sm font-semibold text-[var(--brand-dark)]"
    >
      Approve
    </button>
  );
}

export function ApproveButton({ onApprove }: { onApprove: () => Promise<void> }) {
  const [animating, setAnimating] = useState(false);

  async function handleClick() {
    setAnimating(true);
    await onApprove();
    setTimeout(() => setAnimating(false), 450);
  }

  return (
    <MotionButton animating={animating} onClick={handleClick} />
  );
}
