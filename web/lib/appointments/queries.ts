import { and, asc, eq, gt, gte, lt, ne, or, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  availabilityBlocks,
  availabilityRules,
  coachCalendarSettings,
  members,
  users,
} from "@/lib/db/schema";
import { formatMemberName } from "@/lib/members/types";

export type AppointmentDTO = {
  id: string;
  coachId: string;
  memberId: string;
  memberName: string;
  title: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  status: "booked" | "cancelled" | "completed";
  meetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  location: string | null;
  joinUrl: string | null;
};

export type BlockDTO = {
  id: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
};

export type AvailabilityRuleDTO = {
  id: string;
  weekday: number;
  reason: string | null;
  startsOn: string;
  endsOn: string | null;
};

export type BusyRange = { startsAt: string; endsAt: string };

/** Appointments for a coach in [from, to), with the member's display name. */
export async function listCoachAppointments(
  tenantId: string,
  coachId: string,
  from: Date,
  to: Date,
): Promise<AppointmentDTO[]> {
  const rows = await db
    .select({
      appt: appointments,
      firstName: members.firstName,
      lastName: members.lastName,
      displayName: users.displayName,
      email: users.email,
    })
    .from(appointments)
    .innerJoin(members, eq(appointments.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.coachId, coachId),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  return rows.map((r) => ({
    id: r.appt.id,
    coachId: r.appt.coachId,
    memberId: r.appt.memberId,
    memberName: formatMemberName({
      firstName: r.firstName,
      lastName: r.lastName,
      displayName: r.displayName,
      email: r.email,
    }),
    title: r.appt.title,
    notes: r.appt.notes,
    startsAt: r.appt.startsAt.toISOString(),
    endsAt: r.appt.endsAt.toISOString(),
    status: r.appt.status,
    meetingType: r.appt.meetingType,
    location: r.appt.location,
    joinUrl: r.appt.joinUrl,
  }));
}

/** A member's own appointments in [from, to). */
export async function listMemberAppointments(
  tenantId: string,
  memberId: string,
  from: Date,
  to: Date,
): Promise<AppointmentDTO[]> {
  const rows = await db
    .select({
      appt: appointments,
      firstName: members.firstName,
      lastName: members.lastName,
      displayName: users.displayName,
      email: users.email,
    })
    .from(appointments)
    .innerJoin(members, eq(appointments.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.memberId, memberId),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
      ),
    )
    .orderBy(asc(appointments.startsAt));

  return rows.map((r) => ({
    id: r.appt.id,
    coachId: r.appt.coachId,
    memberId: r.appt.memberId,
    memberName: formatMemberName({
      firstName: r.firstName,
      lastName: r.lastName,
      displayName: r.displayName,
      email: r.email,
    }),
    title: r.appt.title,
    notes: r.appt.notes,
    startsAt: r.appt.startsAt.toISOString(),
    endsAt: r.appt.endsAt.toISOString(),
    status: r.appt.status,
    meetingType: r.appt.meetingType,
    location: r.appt.location,
    joinUrl: r.appt.joinUrl,
  }));
}

/** Anonymized busy ranges (booked appointments) for a coach — safe for members. */
export async function listCoachBusyRanges(
  tenantId: string,
  coachId: string,
  from: Date,
  to: Date,
): Promise<BusyRange[]> {
  const rows = await db
    .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.coachId, coachId),
        eq(appointments.status, "booked"),
        gte(appointments.startsAt, from),
        lt(appointments.startsAt, to),
      ),
    );
  return rows.map((r) => ({
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
  }));
}

export async function listBlocks(
  tenantId: string,
  coachId: string,
  from: Date,
  to: Date,
): Promise<BlockDTO[]> {
  const rows = await db
    .select()
    .from(availabilityBlocks)
    .where(
      and(
        eq(availabilityBlocks.tenantId, tenantId),
        eq(availabilityBlocks.coachId, coachId),
        lt(availabilityBlocks.startsAt, to),
        gt(availabilityBlocks.endsAt, from),
      ),
    )
    .orderBy(asc(availabilityBlocks.startsAt));

  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
  }));
}

export async function listAvailabilityRules(
  tenantId: string,
  coachId: string,
  from: Date,
  to: Date,
): Promise<AvailabilityRuleDTO[]> {
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.tenantId, tenantId),
        eq(availabilityRules.coachId, coachId),
        lte(availabilityRules.startsOn, toDate),
        or(
          isNull(availabilityRules.endsOn),
          gte(availabilityRules.endsOn, fromDate),
        ),
      ),
    );
  return rows.map((r) => ({
    id: r.id,
    weekday: r.weekday,
    reason: r.reason,
    startsOn: r.startsOn,
    endsOn: r.endsOn,
  }));
}

export async function createAvailabilityRule(input: {
  tenantId: string;
  coachId: string;
  weekday: number;
  reason: string | null;
  startsOn: string;
  endsOn: string | null;
}) {
  const [row] = await db.insert(availabilityRules).values(input).returning();
  return row;
}

export async function deleteAvailabilityRule(
  id: string,
  tenantId: string,
  coachId: string,
) {
  await db
    .delete(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, id),
        eq(availabilityRules.tenantId, tenantId),
        eq(availabilityRules.coachId, coachId),
      ),
    );
}

function weekdayInTimeZone(date: Date, timeZone: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
}

function dateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/**
 * Returns true if [startsAt, endsAt) strictly overlaps an existing booked
 * appointment or an availability block for the coach. Optionally exclude one
 * appointment id (used when rescheduling).
 */
export async function hasConflict(
  tenantId: string,
  coachId: string,
  startsAt: Date,
  endsAt: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const s = startsAt.getTime();
  const e = endsAt.getTime();
  const overlaps = (rs: Date, re: Date) => rs.getTime() < e && s < re.getTime();

  const appts = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.coachId, coachId),
        eq(appointments.status, "booked"),
        excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined,
      ),
    );
  if (appts.some((a) => overlaps(a.startsAt, a.endsAt))) return true;

  const blocks = await db
    .select({
      startsAt: availabilityBlocks.startsAt,
      endsAt: availabilityBlocks.endsAt,
    })
    .from(availabilityBlocks)
    .where(
      and(
        eq(availabilityBlocks.tenantId, tenantId),
        eq(availabilityBlocks.coachId, coachId),
      ),
    );
  if (blocks.some((b) => overlaps(b.startsAt, b.endsAt))) return true;

  const [settings] = await db
    .select({ timeZone: coachCalendarSettings.timeZone })
    .from(coachCalendarSettings)
    .where(eq(coachCalendarSettings.coachId, coachId))
    .limit(1);
  const timeZone = settings?.timeZone ?? "Europe/London";
  const localDate = dateInTimeZone(startsAt, timeZone);
  const weekday = weekdayInTimeZone(startsAt, timeZone);
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.tenantId, tenantId),
        eq(availabilityRules.coachId, coachId),
        eq(availabilityRules.weekday, weekday),
        lte(availabilityRules.startsOn, localDate),
        or(
          isNull(availabilityRules.endsOn),
          gte(availabilityRules.endsOn, localDate),
        ),
      ),
    )
    .limit(1);
  return rules.length > 0;
}

export async function createAppointment(input: {
  tenantId: string;
  coachId: string;
  memberId: string;
  title: string | null;
  notes: string | null;
  meetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  location: string | null;
  joinUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  createdBy: string;
}) {
  const [row] = await db
    .insert(appointments)
    .values({
      tenantId: input.tenantId,
      coachId: input.coachId,
      memberId: input.memberId,
      title: input.title,
      notes: input.notes,
      meetingType: input.meetingType,
      location: input.location,
      joinUrl: input.joinUrl,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

export async function getAppointmentById(id: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

export async function updateAppointment(
  id: string,
  tenantId: string,
  patch: Partial<{
    title: string | null;
    notes: string | null;
    startsAt: Date;
    endsAt: Date;
    status: "booked" | "cancelled" | "completed";
    meetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
    location: string | null;
    joinUrl: string | null;
    googleEventId: string | null;
  }>,
) {
  const [row] = await db
    .update(appointments)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning();
  return row ?? null;
}

export async function deleteAppointment(id: string, tenantId: string) {
  await db
    .delete(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
}

export async function createBlock(input: {
  tenantId: string;
  coachId: string;
  reason: string | null;
  startsAt: Date;
  endsAt: Date;
}) {
  const [row] = await db
    .insert(availabilityBlocks)
    .values(input)
    .returning();
  return row;
}

export async function deleteBlock(id: string, tenantId: string, coachId: string) {
  await db
    .delete(availabilityBlocks)
    .where(
      and(
        eq(availabilityBlocks.id, id),
        eq(availabilityBlocks.tenantId, tenantId),
        eq(availabilityBlocks.coachId, coachId),
      ),
    );
}

export async function getBlockById(id: string, tenantId: string, coachId: string) {
  const [row] = await db
    .select()
    .from(availabilityBlocks)
    .where(
      and(
        eq(availabilityBlocks.id, id),
        eq(availabilityBlocks.tenantId, tenantId),
        eq(availabilityBlocks.coachId, coachId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getAvailabilityRuleById(
  id: string,
  tenantId: string,
  coachId: string,
) {
  const [row] = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, id),
        eq(availabilityRules.tenantId, tenantId),
        eq(availabilityRules.coachId, coachId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function setRuleGoogleEventId(id: string, googleEventId: string | null) {
  await db
    .update(availabilityRules)
    .set({ googleEventId })
    .where(eq(availabilityRules.id, id));
}

export type CalendarSettingsInput = {
  preferredMeetingType: "none" | "in_person" | "google_meet" | "zoom" | "whatsapp";
  defaultLocation: string | null;
  defaultZoomUrl: string | null;
  defaultWhatsappUrl: string | null;
  timeZone: string;
};

export async function getCalendarSettings(coachId: string, tenantId: string) {
  const [row] = await db
    .select()
    .from(coachCalendarSettings)
    .where(
      and(
        eq(coachCalendarSettings.coachId, coachId),
        eq(coachCalendarSettings.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertCalendarSettings(
  coachId: string,
  tenantId: string,
  input: Partial<CalendarSettingsInput> & {
    googleRefreshToken?: string | null;
    googleEmail?: string | null;
    googleCalendarId?: string;
    googleConnectedAt?: Date | null;
  },
) {
  const [row] = await db
    .insert(coachCalendarSettings)
    .values({ coachId, tenantId, ...input, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: coachCalendarSettings.coachId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function setAppointmentGoogleDetails(
  id: string,
  googleEventId: string | null,
  joinUrl?: string | null,
) {
  const [row] = await db
    .update(appointments)
    .set({
      googleEventId,
      ...(joinUrl !== undefined ? { joinUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id))
    .returning();
  return row ?? null;
}

export async function setBlockGoogleEventId(id: string, googleEventId: string | null) {
  await db
    .update(availabilityBlocks)
    .set({ googleEventId })
    .where(eq(availabilityBlocks.id, id));
}

export async function getAppointmentNotificationDetails(id: string, tenantId: string) {
  const [row] = await db
    .select({
      appointment: appointments,
      memberEmail: users.email,
      memberDisplayName: users.displayName,
      memberFirstName: members.firstName,
      memberLastName: members.lastName,
    })
    .from(appointments)
    .innerJoin(members, eq(appointments.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .limit(1);
  if (!row) return null;
  return {
    appointment: row.appointment,
    memberEmail: row.memberEmail,
    memberName: formatMemberName({
      firstName: row.memberFirstName,
      lastName: row.memberLastName,
      displayName: row.memberDisplayName,
      email: row.memberEmail,
    }),
  };
}

export async function listCalendarRowsForSync(
  coachId: string,
  tenantId: string,
) {
  const now = new Date();
  const [appointmentRows, blockRows, ruleRows] = await Promise.all([
    db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.coachId, coachId),
          eq(appointments.tenantId, tenantId),
          eq(appointments.status, "booked"),
          gte(appointments.endsAt, now),
        ),
      ),
    db
      .select()
      .from(availabilityBlocks)
      .where(
        and(
          eq(availabilityBlocks.coachId, coachId),
          eq(availabilityBlocks.tenantId, tenantId),
          gte(availabilityBlocks.endsAt, now),
        ),
      ),
    db
      .select()
      .from(availabilityRules)
      .where(
        and(
          eq(availabilityRules.coachId, coachId),
          eq(availabilityRules.tenantId, tenantId),
        ),
      ),
  ]);
  return {
    appointments: appointmentRows,
    blocks: blockRows,
    rules: ruleRows,
  };
}
