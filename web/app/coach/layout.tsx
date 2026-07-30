import { CoachTopNav } from "@/components/coach/coach-top-nav";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell coach-atmosphere min-h-dvh text-white">
      <CoachTopNav />
      <PwaInstallBanner />
      {children}
    </div>
  );
}
