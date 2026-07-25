import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrumentSerif.variable} coach-shell min-h-dvh`}>
      {children}
    </div>
  );
}
