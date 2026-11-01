const { PrismaClient } = require("@prisma/client");
const { prismaConnectionUrl } = require("../dist/prisma/connection-config");
const { databaseFailureMessage } = require("../dist/prisma/database-diagnostics");
const { databaseInspectionQuery, inspectDatabase } = require("../dist/prisma/database-inspection");

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--sql") {
    console.log(`BEGIN READ ONLY;\nSET LOCAL statement_timeout = '10s';\n${databaseInspectionQuery};\nROLLBACK;`);
    return;
  }
  if (args.length) {
    console.error("Usage: pnpm --filter @bamora/api db:diagnose [--sql]");
    process.exitCode = 1;
    return;
  }
  const datasourceUrl = prismaConnectionUrl();
  const schema = new URL(datasourceUrl).searchParams.get("schema") ?? "public";
  const client = new PrismaClient({ datasourceUrl, log: [] });
  try {
    const report = await client.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
      return inspectDatabase(tx, schema);
    }, { maxWait: 5000, timeout: 15000 });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ready) process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}

main().catch(error => {
  console.error(databaseFailureMessage(error));
  process.exitCode = 1;
});
