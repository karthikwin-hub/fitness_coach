import type { ProgramPhase } from "@/lib/members/program-phases";

export type MemberProfile = {
  id: string;
  status: "lead" | "active" | "paused";
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
  location: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  occupation: string | null;
  healthGoals: string[];
  healthIssues: string | null;
  allergies: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  coachNotes: string | null;
  dietPreference: string | null;
  stepGoal: number | null;
  programStartDate: string | null;
  programEndDate: string | null;
  programPhases: ProgramPhase[];
  compliancePct: number;
  streakDays: number;
  createdAt: string;
};

export type MemberProfileUpdate = Partial<{
  status: "lead" | "active" | "paused";
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
  location: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  occupation: string | null;
  healthGoals: string[];
  healthIssues: string | null;
  allergies: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  coachNotes: string | null;
  dietPreference: "indian" | "western" | "hybrid" | "vegetarian" | null;
  stepGoal: number | null;
  programStartDate: string | null;
  programEndDate: string | null;
  programPhases?: ProgramPhase[];
}>;

export function formatMemberName(profile: {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
}): string {
  const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return full || profile.displayName || profile.email;
}
