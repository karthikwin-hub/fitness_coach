export type DevPersonaId =
  | "platform-admin"
  | "coach"
  | "member-demo"
  | "member-hetal"
  | "member-avinash"
  | "member-shruti"
  | "member-new";

export type DevPersona = {
  id: DevPersonaId;
  token: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: "platform_admin" | "coach" | "member";
  label: string;
  description: string;
  memberPath: string;
};

export const DEV_PERSONAS: DevPersona[] = [
  {
    id: "platform-admin",
    token: "dev-local-platform-admin",
    firebaseUid: "dev-platform-admin",
    email: "admin@platform.local",
    displayName: "Platform Admin",
    role: "platform_admin",
    label: "Platform Admin",
    description: "Tenant console — create and manage all tenants",
    memberPath: "/platform",
  },
  {
    id: "coach",
    token: "dev-local-token",
    firebaseUid: "dev-local-user",
    email: "coach@abstrack.local",
    displayName: "Helna (Dev Coach)",
    role: "coach",
    label: "Coach — Helna",
    description: "Command center, members, plan delivery",
    memberPath: "/coach",
  },
  {
    id: "member-demo",
    token: "dev-local-member",
    firebaseUid: "dev-local-member",
    email: "member@abstrack.local",
    displayName: "Demo Member (Hetal)",
    role: "member",
    label: "Member — Demo (Hetal plans)",
    description: "Full dashboard, plans, and check-ins",
    memberPath: "/member",
  },
  {
    id: "member-hetal",
    token: "dev-pilot-hetal",
    firebaseUid: "pilot-hetal",
    email: "hetal@abstrack.local",
    displayName: "Hetal Patel",
    role: "member",
    label: "Member — Hetal",
    description: "USA · home training · hybrid diet",
    memberPath: "/member",
  },
  {
    id: "member-avinash",
    token: "dev-pilot-avinash",
    firebaseUid: "pilot-avinash",
    email: "avinash@abstrack.local",
    displayName: "Dr. Avinash Mehta",
    role: "member",
    label: "Member — Dr. Avinash",
    description: "India · gym training · Indian diet",
    memberPath: "/member",
  },
  {
    id: "member-shruti",
    token: "dev-pilot-shruti",
    firebaseUid: "pilot-shruti",
    email: "shruti@abstrack.local",
    displayName: "Shruti Kapoor",
    role: "member",
    label: "Member — Shruti",
    description: "Australia · home training · vegetarian",
    memberPath: "/member",
  },
  {
    id: "member-new",
    token: "dev-local-new-member",
    firebaseUid: "dev-local-new-member",
    email: "newmember@abstrack.local",
    displayName: "New Member (Priya)",
    role: "member",
    label: "Member — New (no plans)",
    description: "Onboarded account, empty dashboard",
    memberPath: "/member",
  },
];

export const DEV_PERSONA_BY_ID = Object.fromEntries(
  DEV_PERSONAS.map((p) => [p.id, p]),
) as Record<DevPersonaId, DevPersona>;

export const DEV_TOKEN_TO_UID = Object.fromEntries(
  DEV_PERSONAS.map((p) => [p.token, p.firebaseUid]),
) as Record<string, string>;

export function isDevToken(token: string): boolean {
  return token in DEV_TOKEN_TO_UID;
}

export function devTokenForUid(firebaseUid: string): string | null {
  return DEV_PERSONAS.find((p) => p.firebaseUid === firebaseUid)?.token ?? null;
}

export function readStoredDevPersonaId(): DevPersonaId {
  if (typeof window === "undefined") return "coach";
  const stored = localStorage.getItem("devPersona");
  if (stored && stored in DEV_PERSONA_BY_ID) {
    return stored as DevPersonaId;
  }
  return localStorage.getItem("devRole") === "member" ? "member-demo" : "coach";
}

export function storeDevPersonaId(id: DevPersonaId) {
  localStorage.setItem("devPersona", id);
  localStorage.setItem(
    "devRole",
    id === "member-demo" ||
      id === "member-hetal" ||
      id === "member-avinash" ||
      id === "member-shruti" ||
      id === "member-new"
      ? "member"
      : "coach",
  );
}

export function clearDevPersonaStorage() {
  localStorage.removeItem("devPersona");
  localStorage.removeItem("devRole");
}

export function devPersonaToAppUser(persona: DevPersona) {
  return {
    firebaseUid: persona.firebaseUid,
    email: persona.email,
    displayName: persona.displayName,
    role: persona.role,
    tenantSlug: "abstrack",
  };
}
