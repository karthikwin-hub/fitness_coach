import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");

const sql = postgres(url);

async function main() {
  try {
    await sql.unsafe("ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'invited'");
    console.log("member_status 'invited' OK");
  } catch (e) {
    console.log("member_status invited:", e instanceof Error ? e.message : e);
  }

  const [row] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'import_key'
  `;
  console.log("import_key:", row ? "exists" : "missing");

  await sql.end();
}

main();
