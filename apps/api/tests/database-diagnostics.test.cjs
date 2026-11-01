require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PGlite } = require("@electric-sql/pglite");
const { Prisma } = require("@prisma/client");
const { databaseFailureDetails, databaseFailureMessage } = require("../dist/prisma/database-diagnostics");
const { inspectDatabase } = require("../dist/prisma/database-inspection");
const { HealthController } = require("../dist/controllers/health.controller");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { StartupFailure } = require("../dist/common/startup-diagnostics");

const privateMessage = "private-password postgresql://private-user:private-password@private-host/db JWT_SECRET=private-jwt";
const failure = (code, meta) => new Prisma.PrismaClientKnownRequestError(privateMessage, {
  code, meta, clientVersion: Prisma.prismaVersion.client,
});

test("database diagnostics distinguish missing schema, privileges and TLS without raw error details", () => {
  const cases = [
    [failure("P2021"), "missing-table"],
    [failure("P2022"), "missing-column"],
    [failure("P2010", { code: "42P01", message: privateMessage }), "missing-table"],
    [failure("P2010", { code: "42703" }), "missing-column"],
    [failure("P2010", { code: "42501" }), "permission-denied"],
    [new Prisma.PrismaClientInitializationError(privateMessage, Prisma.prismaVersion.client, "P1011"), "tls-verification-failed"],
    [failure("P2024"), "connection-unavailable"],
    [failure("P2002"), "database-query-failed"],
  ];
  for (const [error, category] of cases) {
    assert.equal(databaseFailureDetails(error).category, category);
    const message = databaseFailureMessage(error);
    for (const sensitive of ["private-password", "private-host", "private-user", "private-jwt", "postgresql://"]) {
      assert.ok(!message.includes(sensitive), message);
    }
  }
  assert.equal(databaseFailureDetails(new Error(privateMessage)), undefined);
  assert.ok(!databaseFailureMessage(new Error(privateMessage)).includes("private"));
  assert.equal(databaseFailureDetails(failure("P2010", { code: privateMessage })).sqlState, undefined);
  assert.match(databaseFailureMessage(new StartupFailure("database-configuration", "DATABASE_CA_FILE_UNREADABLE")), /DATABASE_CA_FILE_UNREADABLE/);
});

test("readiness logs original safe SQLSTATE and stays 503 without returning database details", async () => {
  const health = new HealthController({ $queryRawUnsafe: async () => { throw failure("P2010", { code: "42P01" }); } });
  const logs = [];
  health.logger = { error: message => logs.push(message) };
  await assert.rejects(() => health.ready(), error => error.getStatus() === 503);
  assert.match(logs[0], /42P01/);
  assert.match(logs[0], /missing-table/);
  assert.ok(!logs[0].includes("private-password"));
});

test("HTTP database failures become explicit 503 while other failures retain their status", () => {
  const { BadRequestException } = require("@nestjs/common");
  for (const [error, expected] of [[failure("P2021"), 503], [failure("P2002"), 500], [new BadRequestException("Invalid request"), 400]]) {
    const filter = new HttpExceptionFilter();
    const logs = [];
    filter.logger = { error: message => logs.push(message) };
    let status;
    let body;
    const response = { status: value => { status = value; return response; }, json: value => { body = value; } };
    filter.catch(error, { switchToHttp: () => ({
      getRequest: () => ({ method: "GET", path: "/api/catalog/categories", url: "/api/catalog/categories?token=private-token" }),
      getResponse: () => response,
    }) });
    assert.equal(status, expected);
    assert.ok(!JSON.stringify(body.message).includes("private-password"));
    assert.ok(!logs[0].includes("private-token"));
    assert.ok(!logs[0].includes("private-password"));
  }
});

test("metadata inspection reports missing tables and columns without reading records or changing schema", async () => {
  const db = new PGlite();
  const proxy = { $queryRawUnsafe: async sql => (await db.query(sql)).rows };
  try {
    await db.exec("BEGIN READ ONLY");
    const empty = await inspectDatabase(proxy, "public");
    assert.equal(empty.ready, false);
    assert.equal(empty.tables.find(table => table.table === "categories").exists, false);
    await db.exec("ROLLBACK");
    await db.exec(fs.readFileSync(path.join(__dirname, "../prisma/migrations/20261011000000_initial/migration.sql"), "utf8"));
    await db.exec(fs.readFileSync(path.join(__dirname, "../prisma/migrations/20261013120000_guest_checkout_consent/migration.sql"), "utf8"));
    await db.exec("BEGIN READ ONLY");
    const complete = await inspectDatabase(proxy, "public");
    assert.equal(complete.ready, true);
    assert.ok(complete.tables.every(table => table.exists));
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; ALTER TABLE order_items DROP COLUMN image_snapshot");
    const incomplete = await inspectDatabase(proxy, "public");
    assert.equal(incomplete.ready, false);
    assert.ok(incomplete.tables.find(table => table.table === "order_items").missingColumns.includes("image_snapshot"));
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; CREATE ROLE inspection_test; GRANT USAGE ON SCHEMA public TO inspection_test; GRANT SELECT ON ALL TABLES IN SCHEMA public TO inspection_test; REVOKE SELECT ON categories FROM inspection_test; SET LOCAL ROLE inspection_test; SET TRANSACTION READ ONLY");
    const forbidden = await inspectDatabase(proxy, "public");
    const category = forbidden.tables.find(table => table.table === "categories");
    assert.equal(category.exists, true);
    assert.ok(category.unreadableColumns.length > 0);
    assert.equal(forbidden.ready, false);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; CREATE SCHEMA alternate; ALTER TABLE categories SET SCHEMA alternate");
    const elsewhere = await inspectDatabase(proxy, "public");
    assert.deepEqual(elsewhere.tables.find(table => table.table === "categories").otherSchemas, ["alternate"]);
    await db.exec("ROLLBACK");
  } finally {
    await db.close();
  }
});

test("diagnostic SQL export never connects, loads environment files, or reads application records", () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, "../scripts/diagnose-database.cjs"), "--sql"], {
    encoding: "utf8", env: { ...process.env, DATABASE_URL: "invalid-url", DATABASE_SSL_CA_FILE: "invalid-path" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^BEGIN READ ONLY;/);
  assert.match(result.stdout, /pg_catalog\.pg_class/);
  assert.match(result.stdout, /has_column_privilege/);
  assert.match(result.stdout, /ROLLBACK;/);
  assert.doesNotMatch(result.stdout, /\b(INSERT|UPDATE|DELETE|ALTER|CREATE|GRANT)\b/i);
  const source = fs.readFileSync(path.join(__dirname, "../scripts/diagnose-database.cjs"), "utf8");
  assert.match(source, /SET TRANSACTION READ ONLY/);
  assert.match(source, /statement_timeout/);
  assert.doesNotMatch(source, /dotenv|readFileSync|migrate|seed/);
});
