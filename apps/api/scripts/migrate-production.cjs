const path = require("node:path");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
const { prismaConnectionUrl } = require("../dist/prisma/connection-config");
const { databaseReadinessQuery } = require("../dist/prisma/database-readiness");
const { StartupFailure } = require("../dist/common/startup-diagnostics");

const apiRoot = path.resolve(__dirname, "..");
const cli = require.resolve("prisma/build/index.js");
const fail = code => { throw new StartupFailure("database-configuration", code); };

function configure(environment) {
  const env = { ...environment };
  if (!env.DATABASE_URL) fail("EXECUTION_DATABASE_URL_REQUIRED");
  const expected = env.BAMORA_EXPECTED_DATABASE_PROJECT;
  if (expected !== "nmhccvyjttluanarixvu") fail("EXPECTED_SUPABASE_PROJECT_REQUIRED");
  if (require("prisma/package.json").version !== "6.19.3" ||
      require("@prisma/client/package.json").version !== "6.19.3") fail("PRISMA_VERSION_MISMATCH");
  const configured = prismaConnectionUrl({ ...env, NODE_ENV: "production" });
  const url = new URL(configured);
  if (url.hostname !== `db.${expected}.supabase.co` &&
      !(url.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(url.username) === `postgres.${expected}`)) fail("SUPABASE_PROJECT_MISMATCH");
  if (url.pathname !== "/postgres") fail("SUPABASE_DATABASE_NAME_MISMATCH");
  if ((url.searchParams.get("schema") ?? "public") !== "public" ||
      url.searchParams.getAll("schema").length > 1) fail("PUBLIC_SCHEMA_REQUIRED");
  if (!env.DATABASE_SSL_CA_FILE?.trim()) fail("MIGRATION_CA_FILE_REQUIRED");
  url.searchParams.set("connect_timeout", "10");
  url.searchParams.set("pool_timeout", "5");
  return { env, datasourceUrl: `${configured.split("?")[0]}?${url.searchParams}` };
}

async function checkDatabase(client) {
  return client.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
    const objects = await tx.$queryRawUnsafe(`
      SELECT c.relname FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f','S')
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d
          WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
      UNION ALL SELECT t.typname FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d
          WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')`);
    if (objects.length) fail("PUBLIC_SCHEMA_NOT_EMPTY_INITIAL_MIGRATION_BLOCKED");
    const permissions = await tx.$queryRawUnsafe(`SELECT
      has_schema_privilege('public', 'USAGE') AS can_use,
      has_schema_privilege('public', 'CREATE') AS can_create`);
    if (!permissions[0]?.can_use || !permissions[0]?.can_create) fail("MIGRATION_SCHEMA_PERMISSION_REQUIRED");
    return { tlsConnectionSucceeded: true, publicSchemaEmpty: true, schemaPermissionsConfirmed: true };
  }, { maxWait: 5000, timeout: 15000 });
}

function migrationChecksums(contents) {
  const text = contents.toString("utf8");
  return [...new Set([text, text.replace(/\r\n/g, "\n"), text.replace(/\r?\n/g, "\r\n")])]
    .map(value => createHash("sha256").update(value).digest("hex"));
}

function expectedMigrations() {
  const root = path.join(apiRoot, "prisma", "migrations");
  const migrations = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => ({
      name: entry.name,
      checksums: migrationChecksums(fs.readFileSync(path.join(root, entry.name, "migration.sql"))),
    }));
  if (migrations.length !== 2 ||
      migrations[0].name !== "20261011000000_initial" ||
      migrations[1].name !== "20261013120000_guest_checkout_consent") {
    fail("UNEXPECTED_INITIAL_MIGRATION_SET");
  }
  return migrations;
}

async function alreadyInitialized(client, expected) {
  return client.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
    const exists = await tx.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists");
    if (!exists[0]?.exists) return false;
    const rows = await tx.$queryRawUnsafe(
      'SELECT migration_name, checksum, finished_at, rolled_back_at FROM public._prisma_migrations',
    );
    if (rows.length !== expected.length || expected.some(migration => !rows.some(row =>
      row.migration_name === migration.name && migration.checksums.includes(row.checksum) &&
      row.finished_at !== null && row.rolled_back_at === null))) {
      fail("INITIAL_MIGRATION_HISTORY_INCOMPLETE_OR_CHANGED");
    }
    await tx.$queryRawUnsafe(databaseReadinessQuery);
    return true;
  }, { maxWait: 5000, timeout: 15000 });
}

async function main(args = process.argv.slice(2)) {
  if (args.some(arg => !["--check", "--initialize"].includes(arg))) fail("INVALID_MIGRATION_ARGUMENTS");
  if (args.includes("--check") && args.includes("--initialize")) fail("INVALID_MIGRATION_ARGUMENTS");
  const { env, datasourceUrl } = configure(process.env);
  const expected = expectedMigrations();
  const client = new PrismaClient({ datasourceUrl, log: [] });
  try {
    if (args.includes("--initialize") && await alreadyInitialized(client, expected)) {
      console.log("Initial migrations already completed and schema readable; no migration executed.");
      return;
    }
    console.log(JSON.stringify(await checkDatabase(client)));
    if (args.includes("--check")) return;
    const result = spawnSync(process.execPath, [cli, "migrate", "deploy", "--schema", path.join(apiRoot, "prisma", "schema.prisma")], {
      cwd: apiRoot, env: { ...env, NODE_ENV: "production", DATABASE_URL: datasourceUrl },
      encoding: "utf8", timeout: 120000, maxBuffer: 2 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
      fail(`${result.stdout ?? ""}\n${result.stderr ?? ""}`.match(/\bP\d{4}\b/)?.[0] ?? "PRISMA_MIGRATION_FAILED_DETAILS_WITHHELD");
    }
    console.log("Existing migrations applied once; sensitive CLI output withheld.");
    if (!await alreadyInitialized(client, expected)) fail("MIGRATION_HISTORY_MISSING_AFTER_DEPLOY");
    console.log(JSON.stringify({ databaseReady: true, requiredTablesAndColumnsReadable: true }));
  } finally {
    await client.$disconnect();
  }
}

module.exports = { configure, checkDatabase, alreadyInitialized, migrationChecksums, expectedMigrations, main };
if (require.main === module) main().catch(error => {
  const candidate = error instanceof StartupFailure ? error.safeCode : error?.errorCode ?? error?.code;
  const code = error instanceof StartupFailure || typeof candidate === "string" && /^P\d{4}$/.test(candidate)
    ? candidate : "MIGRATION_OPERATION_FAILED_DETAILS_WITHHELD";
  console.error(`Production migration stopped: ${code}`);
  process.exitCode = 1;
});
