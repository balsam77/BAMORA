require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PGlite } = require("@electric-sql/pglite");
const { Prisma } = require("@prisma/client");
const { HealthController } = require("../dist/controllers/health.controller");
const { databaseReadinessQuery } = require("../dist/prisma/database-readiness");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "prisma", "migrations", "20261011000000_initial", "migration.sql"), "utf8",
);

test("initial migration creates the complete Prisma schema in disposable in-memory PostgreSQL", async (t) => {
  const db = new PGlite();
  const health = new HealthController({
    $queryRawUnsafe: async (sql) => (await db.query(sql)).rows,
  });
  const unavailable = (error) => {
    assert.equal(error.getStatus(), 503);
    assert.equal(error.message, "Database is unavailable or its schema is incompatible.");
    return true;
  };
  try {
    await t.test("a connected but empty database is not ready", async () => {
      assert.equal((await db.query("SELECT 1 AS connected")).rows[0].connected, 1);
      await assert.rejects(() => health.ready(), unavailable);
    });

    await db.exec(migration);

    await t.test("all model tables and scalar columns exist, without seeded data", async () => {
      const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
      assert.deepEqual(
        tables.rows.map((row) => row.table_name).sort(),
        Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name).sort(),
      );
      for (const model of Prisma.dmmf.datamodel.models) {
        const columns = await db.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
          [model.dbName ?? model.name],
        );
        assert.deepEqual(
          columns.rows.map((row) => row.column_name).sort(),
          model.fields.filter((field) => field.kind !== "object").map((field) => field.dbName ?? field.name).sort(),
          model.name,
        );
        const table = `"${(model.dbName ?? model.name).replace(/"/g, '""')}"`;
        const records = await db.query(`SELECT COUNT(*) AS count FROM ${table}`);
        assert.equal(Number(records.rows[0].count), 0, `${model.name} must not contain seeded data`);
      }
      const counts = (await db.query(databaseReadinessQuery)).rows[0];
      assert.ok(Object.values(counts).every((count) => Number(count) === 0));
      assert.deepEqual(await health.ready(), { status: "ok", service: "bamora-api", database: "connected" });
    });

    await t.test("all enum values, primary keys, indexes and foreign keys are installed", async () => {
      for (const enumeration of Prisma.dmmf.datamodel.enums) {
        const values = await db.query(
          "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder",
          [enumeration.dbName ?? enumeration.name],
        );
        assert.deepEqual(values.rows.map((row) => row.enumlabel), enumeration.values.map((value) => value.dbName ?? value.name));
      }
      const constraints = await db.query(
        "SELECT contype, COUNT(*) AS count FROM pg_constraint WHERE connamespace = 'public'::regnamespace GROUP BY contype",
      );
      const countFor = (type) => Number(constraints.rows.find((row) => row.contype === type)?.count ?? 0);
      assert.equal(countFor("p"), Prisma.dmmf.datamodel.models.length);
      assert.equal(countFor("f"), (migration.match(/FOREIGN KEY/g) ?? []).length);
      const indexes = await db.query("SELECT COUNT(*) AS count FROM pg_indexes WHERE schemaname = 'public'");
      assert.equal(Number(indexes.rows[0].count), countFor("p") + (migration.match(/CREATE (?:UNIQUE )?INDEX/g) ?? []).length);
    });

    await t.test("a missing required table returns 503 even though SELECT 1 succeeds", async () => {
      await db.exec("BEGIN; DROP TABLE media_assets;");
      try {
        await assert.rejects(() => health.ready(), unavailable);
      } finally {
        await db.exec("ROLLBACK");
      }
    });

    await t.test("a missing required column returns 503 without exposing SQL details", async () => {
      await db.exec("BEGIN; ALTER TABLE order_items DROP COLUMN image_snapshot;");
      try {
        await assert.rejects(() => health.ready(), unavailable);
      } finally {
        await db.exec("ROLLBACK");
      }
      assert.deepEqual(await health.ready(), { status: "ok", service: "bamora-api", database: "connected" });
    });

    await t.test("readiness fails when the application role cannot read a required table", async () => {
      await db.exec("BEGIN; CREATE ROLE readiness_test; GRANT USAGE ON SCHEMA public TO readiness_test; GRANT SELECT ON ALL TABLES IN SCHEMA public TO readiness_test; REVOKE SELECT ON users FROM readiness_test; SET LOCAL ROLE readiness_test;");
      try {
        await assert.rejects(() => health.ready(), unavailable);
      } finally {
        await db.exec("ROLLBACK");
      }
    });
  } finally {
    await db.close();
  }
});

test("offline Prisma validation and full initial SQL comparison succeed", () => {
  const apiRoot = path.join(__dirname, "..");
  assert.match(fs.readFileSync(path.join(apiRoot, "prisma", "migrations", "migration_lock.toml"), "utf8"), /provider = "postgresql"/);
  for (const mode of ["validate", "check"]) {
    const result = spawnSync(process.execPath, [path.join(apiRoot, "scripts", "prisma-offline.cjs"), mode], {
      cwd: apiRoot,
      encoding: "utf8",
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no database connection was made/);
  }
});

test("readiness uses only generated identifiers and zero-row SELECTs for every model", () => {
  assert.equal((databaseReadinessQuery.match(/LIMIT 0/g) ?? []).length, Prisma.dmmf.datamodel.models.length);
  assert.doesNotMatch(databaseReadinessQuery, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)\b/i);
  assert.ok(databaseReadinessQuery.startsWith("SELECT "));
});

test("Render build and startup do not automatically migrate or seed", () => {
  const pkg = require("../package.json");
  const render = fs.readFileSync(path.join(__dirname, "..", "..", "..", "render.yaml"), "utf8");
  assert.match(pkg.scripts.build, /pnpm db:generate/);
  assert.doesNotMatch(pkg.scripts.build + pkg.scripts.start, /migrate|db:push|seed/);
  assert.match(pkg.scripts["db:migrate:deploy"], /^prisma migrate deploy$/);
  assert.doesNotMatch(render, /migrate|db:push|seed/);
  assert.match(render, /PAYMENTS_ENABLED\s+value: "false"/);
});
