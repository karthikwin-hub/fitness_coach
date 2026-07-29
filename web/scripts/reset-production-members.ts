import { config } from "dotenv";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../lib/db";
import { seedDemoMemberHistory } from "../lib/db/demo-member-history";
import { seedDemoPlanTemplates } from "../lib/db/demo-plan-templates";
import {
  isLocalDatabaseUrl,
  KEEP_MEMBER_EMAILS,
  shouldKeepMemberEmail,
} from "../lib/db/reset-production-members";
import {
  appointments,
  exercises,
  members,
  messages,
  planDeliveries,
  planPublications,
  planTemplates,
  coachBroadcasts,
  tenants,
  users,
} from "../lib/db/schema";
import { getCanonicalCoachId } from "../lib/members/canonical-coach";
import { installTenantPlanDefaults } from "../lib/plans/install-defaults";
import { EXERCISE_CATALOG } from "../lib/plans/exercise-catalog";

config({ path: ".env.local" });
config({ path: ".env" });

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    confirm: argv.includes("--confirm"),
  };
}

async function main() {
  const { dryRun, confirm } = parseArgs(process.argv.slice(2));
  const envConfirmed = process.env.RESET_PRODUCTION_MEMBERS === "1";

  if (!dryRun && !confirm && !envConfirmed) {
    console.error(
      "Refusing to run without --confirm or RESET_PRODUCTION_MEMBERS=1 (use --dry-run to preview).",
    );
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  if (isLocalDatabaseUrl(databaseUrl) && process.env.ALLOW_LOCAL_RESET !== "1") {
    console.error(
      "DATABASE_URL points to localhost. Set ALLOW_LOCAL_RESET=1 to run against local Postgres.",
    );
    process.exit(1);
  }

  const [tenant] = await db
    .select({ id: tenants.id, slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.slug, "abstrack"))
    .limit(1);

  if (!tenant) {
    console.error("Tenant abstrack not found.");
    process.exit(1);
  }

  const memberUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      memberId: members.id,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.tenantId, tenant.id), eq(users.role, "member")));

  const toRemove = memberUsers.filter((row) => !shouldKeepMemberEmail(row.email));
  const toKeep = memberUsers.filter((row) => shouldKeepMemberEmail(row.email));

  console.log(`Tenant: ${tenant.slug} (${tenant.id})`);
  console.log(`Keeping ${toKeep.length} member(s):`);
  for (const row of toKeep) {
    console.log(`  - ${row.email} (${row.displayName ?? "—"})`);
  }
  console.log(`${dryRun ? "Would remove" : "Removing"} ${toRemove.length} member(s):`);
  for (const row of toRemove) {
    console.log(`  - ${row.email} (${row.displayName ?? "—"})`);
  }

  if (toRemove.length === 0 && dryRun) {
    console.log("No members to remove.");
  }

  const removeUserIds = toRemove.map((r) => r.userId);
  const removeMemberIds = toRemove.map((r) => r.memberId);

  if (!dryRun && removeUserIds.length > 0) {
    const coachId = await getCanonicalCoachId(tenant.id);

    await db
      .delete(messages)
      .where(
        or(
          inArray(messages.senderId, removeUserIds),
          inArray(messages.recipientId, removeUserIds),
        ),
      );

    if (removeMemberIds.length > 0) {
      await db
        .update(planTemplates)
        .set({ sourceMemberId: null })
        .where(inArray(planTemplates.sourceMemberId, removeMemberIds));

      await db
        .delete(appointments)
        .where(inArray(appointments.memberId, removeMemberIds));
    }

    if (coachId) {
      await db
        .update(appointments)
        .set({ createdBy: coachId })
        .where(inArray(appointments.createdBy, removeUserIds));

      await db
        .update(planDeliveries)
        .set({ createdBy: coachId })
        .where(inArray(planDeliveries.createdBy, removeUserIds));

      await db
        .update(planPublications)
        .set({ publishedBy: coachId })
        .where(inArray(planPublications.publishedBy, removeUserIds));

      await db
        .update(coachBroadcasts)
        .set({ createdBy: coachId })
        .where(inArray(coachBroadcasts.createdBy, removeUserIds));
    }

    await db.delete(users).where(inArray(users.id, removeUserIds));
    console.log(`Deleted ${removeUserIds.length} user(s) and cascaded member data.`);
  }

  if (!dryRun) {
    await installTenantPlanDefaults(tenant.id);
    const allExercises = await db
      .select()
      .from(exercises)
      .where(eq(exercises.tenantId, tenant.id));
    const exerciseMapBySlug: Record<string, string> = {};
    for (const ex of allExercises) {
      if (ex.slug) exerciseMapBySlug[ex.slug] = ex.id;
    }

    for (const seed of EXERCISE_CATALOG) {
      if (exerciseMapBySlug[seed.slug]) continue;
      const [inserted] = await db
        .insert(exercises)
        .values({
          tenantId: tenant.id,
          slug: seed.slug,
          name: seed.name,
          youtubeVideoId: seed.youtubeVideoId,
          muscleGroup: seed.muscleGroup,
          equipment: seed.equipment,
          defaultReps: seed.defaultReps,
          defaultSets: seed.defaultSets,
        })
        .returning();
      exerciseMapBySlug[seed.slug] = inserted.id;
    }

    const coachId = await getCanonicalCoachId(tenant.id);
    if (!coachId) {
      console.error("No coach found for tenant; cannot seed demo members.");
      process.exit(1);
    }

    await seedDemoPlanTemplates(tenant.id);
    console.log("Seeded demo plan templates (1001–1004).");

    await seedDemoMemberHistory(tenant.id, coachId, exerciseMapBySlug);
    console.log("Seeded Gautam Rao (10001) and Sarah Mitchell (10002) demo history.");
  }

  const finalMembers = await db
    .select({
      email: users.email,
      displayName: users.displayName,
      importKey: members.importKey,
      status: members.status,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.tenantId, tenant.id))
    .orderBy(users.email);

  console.log("\nFinal member roster:");
  for (const row of finalMembers) {
    console.log(
      `  - ${row.email} | ${row.displayName ?? "—"} | import_key=${row.importKey ?? "—"} | status=${row.status}`,
    );
  }
  console.log(`Total: ${finalMembers.length} member(s)`);

  if (dryRun) {
    console.log("\nDry run complete — no changes made.");
  } else {
    console.log("\nProduction member reset complete.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
