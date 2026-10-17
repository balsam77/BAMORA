const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");

async function snapshot(db) {
  const queries = [
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, column_name`,
    `SELECT c.relname, con.conname, pg_get_constraintdef(con.oid) AS definition
     FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
     WHERE con.connamespace = 'public'::regnamespace ORDER BY c.relname, con.conname`,
    `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname`,
    `SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typnamespace = 'public'::regnamespace ORDER BY t.typname, e.enumsortorder`,
  ];
  return Promise.all(queries.map(async (query) => (await db.query(query)).rows));
}

async function check() {
  const actual = new PGlite();
  const expected = new PGlite();
  try {
    const migrations = path.join(__dirname, "../prisma/migrations");
    for (const entry of fs.readdirSync(migrations, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await actual.exec(fs.readFileSync(path.join(migrations, entry.name, "migration.sql"), "utf8"));
    }
    await expected.exec(fs.readFileSync(0, "utf8"));
    assert.deepEqual(await snapshot(actual), await snapshot(expected), "Migration history must match schema.prisma.");
  } finally {
    await actual.close();
    await expected.close();
  }
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
