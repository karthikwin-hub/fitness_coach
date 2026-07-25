export type ProgramPhase = {
  label: string;
  startDate: string;
  endDate: string;
};

function parseDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Default 3 phases split evenly across program dates. */
export function defaultProgramPhases(
  programStartDate: string,
  programEndDate: string,
): ProgramPhase[] {
  const start = parseDate(programStartDate);
  const end = parseDate(programEndDate);
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const chunk = Math.ceil(totalDays / 3);
  const labels = ["Metabolic reset", "Strength block", "Maintenance"];
  return labels.map((label, i) => ({
    label,
    startDate: addDays(programStartDate, i * chunk),
    endDate:
      i === 2
        ? programEndDate
        : addDays(programStartDate, (i + 1) * chunk - 1),
  }));
}

export function normalizeProgramPhases(
  raw: unknown,
  programStartDate: string | null,
  programEndDate: string | null,
): ProgramPhase[] {
  if (Array.isArray(raw) && raw.length > 0) {
    const phases = raw
      .filter(
        (p): p is ProgramPhase =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as ProgramPhase).label === "string" &&
          typeof (p as ProgramPhase).startDate === "string" &&
          typeof (p as ProgramPhase).endDate === "string",
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (phases.length > 0) return phases;
  }
  if (programStartDate && programEndDate) {
    return defaultProgramPhases(programStartDate, programEndDate);
  }
  return [];
}

export function currentProgramPhase(
  phases: ProgramPhase[],
  today = formatDate(new Date()),
): ProgramPhase | null {
  if (phases.length === 0) return null;
  const match = phases.find((p) => today >= p.startDate && today <= p.endDate);
  return match ?? phases[phases.length - 1];
}
