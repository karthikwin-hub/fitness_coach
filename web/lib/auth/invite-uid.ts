import { randomUUID } from "crypto";

export const INVITE_UID_PREFIX = "invite-";

export function isInviteFirebaseUid(uid: string): boolean {
  return uid.startsWith(INVITE_UID_PREFIX);
}

export function mintInviteFirebaseUid(): string {
  return `${INVITE_UID_PREFIX}${randomUUID()}`;
}
