const { PrismaClient } = require("@prisma/client");
const { prismaConnectionUrl } = require("../dist/prisma/connection-config");
const { inspectDatabase } = require("../dist/prisma/database-inspection");
const { databaseReadinessQuery } = require("../dist/prisma/database-readiness");
const { databaseFailureMessage } = require("../dist/prisma/database-diagnostics");
const { StartupFailure } = require("../dist/common/startup-diagnostics");

const expectedProject = "nmhccvyjttluanarixvu";
const fail = code => { throw new StartupFailure("database-configuration", code); };

function verifiedUrl(input) {
  if (!input || typeof input.databaseUrl !== "string" || typeof input.caFile !== "string") {
    fail("INVALID_VERIFICATION_INPUT");
  }
  const datasourceUrl = prismaConnectionUrl({
    NODE_ENV: "production",
    DATABASE_URL: input.databaseUrl,
    DATABASE_SSL_CA_FILE: input.caFile,
  });
  const url = new URL(datasourceUrl);
  const direct = url.hostname === `db.${expectedProject}.supabase.co`;
  const pooler = url.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(url.username) === `postgres.${expectedProject}`;
  if (!direct && !pooler) fail("SUPABASE_PROJECT_MISMATCH");
  if (url.pathname !== "/postgres") fail("SUPABASE_DATABASE_NAME_MISMATCH");
  if ((url.searchParams.get("schema") ?? "public") !== "public" ||
      url.searchParams.getAll("schema").length > 1) fail("PUBLIC_SCHEMA_REQUIRED");
  if (!input.caFile.trim()) fail("VERIFIED_CA_REQUIRED");
  url.searchParams.set("connect_timeout", "10");
  url.searchParams.set("pool_timeout", "5");
  return `${datasourceUrl.split("?")[0]}?${url.searchParams}`;
}

async function verify(input, createClient = options => new PrismaClient(options)) {
  const datasourceUrl = verifiedUrl(input);
  const client = createClient({ datasourceUrl, log: [] });
  try {
    return await client.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
      await tx.$queryRawUnsafe("SELECT 1 AS connected");
      const report = await inspectDatabase(tx, "public");
      if (report.ready) await tx.$queryRawUnsafe(databaseReadinessQuery);
      const history = await tx.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists");
      return {
        expectedProject,
        projectMatches: true,
        postgresQuerySucceeded: true,
        strictTlsWithConfiguredCa: true,
        schema: "public",
        allRequiredTablesAndColumnsReadable: report.ready,
        migrationHistoryExists: history[0]?.exists === true,
        missingTables: report.tables.filter(table => !table.exists).map(table => table.table),
        incompatibleTables: report.tables.filter(table => table.exists &&
          (table.missingColumns.length || table.unreadableColumns.length)),
        matchingTablesInOtherSchemas: report.tables.filter(table => table.otherSchemas.length)
          .map(table => ({ table: table.table, schemas: table.otherSchemas })),
        readOnly: true,
      };
    }, { maxWait: 5000, timeout: 20000 });
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  let payload = "";
  for await (const chunk of process.stdin) {
    payload += chunk;
    if (payload.length > 32768) fail("VERIFICATION_INPUT_TOO_LARGE");
  }
  let input;
  try { input = JSON.parse(payload); }
  catch { fail("INVALID_VERIFICATION_INPUT"); }
  payload = "";
  try {
    const result = await verify(input);
    console.log(JSON.stringify(result, null, 2));
    if (!result.allRequiredTablesAndColumnsReadable) process.exitCode = 1;
  } finally {
    input.databaseUrl = undefined;
  }
}

module.exports = { verifiedUrl, verify };
if (require.main === module) {
  const deadline = setTimeout(() => {
    console.error("Verification timed out; no migration was executed.");
    process.exit(1);
  }, 40000);
  main().catch(error => {
    console.error(databaseFailureMessage(error));
    process.exitCode = 1;
  }).finally(() => clearTimeout(deadline));
}
