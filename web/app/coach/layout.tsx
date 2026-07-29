import { CoachTopNav } from "@/components/coach/coach-top-nav";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell coach-atmosphere min-h-dvh text-white">
      <CoachTopNav />
      {children}
    </div>
  );
}
