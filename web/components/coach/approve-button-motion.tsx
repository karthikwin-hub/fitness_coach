"use client";

import { motion } from "framer-motion";

export function ApproveButtonMotion({
  animating,
  onClick,
}: {
  animating: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={
        animating
          ? { x: 12, opacity: 0.85, boxShadow: "0 0 24px rgba(138, 199, 91, 0.55)" }
          : { x: 0, opacity: 1, boxShadow: "0 0 0 rgba(138, 199, 91, 0)" }
      }
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="tap-target rounded-xl bg-[var(--brand-diet)] px-6 py-3 text-sm font-semibold text-[var(--brand-dark)]"
    >
      Approve
    </motion.button>
  );
}
