import { CoachTopNav } from "@/components/coach/coach-top-nav";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell min-h-dvh">
      <CoachTopNav />
      {children}
    </div>
  );
}
