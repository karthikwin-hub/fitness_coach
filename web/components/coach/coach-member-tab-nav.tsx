"use client";

export type CoachMemberTab = "check-ins" | "journey" | "profile";

const TABS: { id: CoachMemberTab; label: string }[] = [
  { id: "check-ins", label: "Check-ins" },
  { id: "journey", label: "Program journey" },
  { id: "profile", label: "Profile" },
];

export function CoachMemberTabNav({
  active,
  onChange,
}: {
  active: CoachMemberTab;
  onChange: (tab: CoachMemberTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 pb-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
            active === tab.id
              ? "border-[var(--brand-diet)] bg-[var(--brand-diet)]/15 text-[var(--brand-diet)]"
              : "border-white/15 text-white/70 hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function parseCoachMemberTab(value: string | null): CoachMemberTab {
  if (value === "journey" || value === "profile") return value;
  return "check-ins";
}
