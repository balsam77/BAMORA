const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { rootCertificates } = require("node:tls");
const { X509Certificate } = require("node:crypto");
const { configure, checkDatabase, alreadyInitialized, migrationChecksums, expectedMigrations } = require("../scripts/migrate-production.cjs");

test("migration connection preserves credentials and requires the confirmed Supabase project and strict CA", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "bamora-migration-"));
  const file = path.join(folder, "ca.crt");
  fs.writeFileSync(file, rootCertificates.find(pem => {
    const ca = new X509Certificate(pem);
    return ca.ca && Date.parse(ca.validFrom) <= Date.now() && Date.parse(ca.validTo) > Date.now();
  }));
  const project = "nmhccvyjttluanarixvu";
  const stored = { DATABASE_URL: `postgresql://postgres.${project}:fixture%40password@aws-0-test.pooler.supabase.com:5432/postgres` };
  const env = { BAMORA_EXPECTED_DATABASE_PROJECT: project, DATABASE_SSL_CA_FILE: file, ...stored };
  try {
    const actual = configure(env);
    const url = new URL(actual.datasourceUrl);
    assert.equal(url.searchParams.get("sslaccept"), "strict");
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("sslcert"), file);
    assert.equal(actual.env.DATABASE_URL, stored.DATABASE_URL);
    assert.equal(url.password, "fixture%40password");
    assert.throws(() => configure({ ...env, BAMORA_EXPECTED_DATABASE_PROJECT: "b".repeat(20) }), /EXPECTED_SUPABASE_PROJECT_REQUIRED/);
    assert.throws(() => configure({ ...env, DATABASE_URL: stored.DATABASE_URL.replace(project, "b".repeat(20)) }), /SUPABASE_PROJECT_MISMATCH/);
    assert.throws(() => configure({ ...env, DATABASE_URL: stored.DATABASE_URL + "?schema=other" }), /PUBLIC_SCHEMA_REQUIRED/);
    assert.throws(() => configure({ ...env, DATABASE_URL: undefined }), /EXECUTION_DATABASE_URL_REQUIRED/);
    assert.equal(env.DATABASE_URL, stored.DATABASE_URL);
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(folder);
  }
});

test("production migration never falls back to local dotenv files", () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/migrate-production.cjs"), "utf8");
  assert.doesNotMatch(source, /dotenv|prisma", "\.env/);
  assert.match(source, /configure\(process\.env\)/);
  assert.match(source, /DATABASE_URL: datasourceUrl/);
  assert.throws(() => configure({}), /EXECUTION_DATABASE_URL_REQUIRED/);
});

test("restart skips initialization only for exact completed migration history and readable schema", async () => {
  const expected = [{ name: "initial", checksums: ["fixture-hash"] }];
  let readiness = 0;
  const client = (exists, rows) => ({ $transaction: async callback => callback({
    $executeRawUnsafe: async () => {},
    $queryRawUnsafe: async sql => {
      if (sql.includes("to_regclass")) return [{ exists }];
      if (sql.includes("migration_name")) return rows;
      readiness++;
      return [];
    },
  }) });
  assert.equal(await alreadyInitialized(client(false, []), expected), false);
  const complete = { migration_name: "initial", checksum: "fixture-hash", finished_at: new Date(), rolled_back_at: null };
  assert.equal(await alreadyInitialized(client(true, [complete]), expected), true);
  assert.equal(readiness, 1);
  for (const rows of [[], [{ ...complete, finished_at: null }], [{ ...complete, checksum: "changed" }], [{ ...complete, rolled_back_at: new Date() }]]) {
    await assert.rejects(() => alreadyInitialized(client(true, rows), expected), /INITIAL_MIGRATION_HISTORY_INCOMPLETE_OR_CHANGED/);
  }
});

test("migration history tolerates Windows line endings but never changed SQL or unexpected migration sets", () => {
  const lf = "CREATE TABLE fixture (\n id TEXT\n);\n";
  const crlf = lf.replace(/\n/g, "\r\n");
  assert.deepEqual(new Set(migrationChecksums(Buffer.from(lf))), new Set(migrationChecksums(Buffer.from(crlf))));
  const changed = migrationChecksums(Buffer.from(lf.replace("TEXT", "INTEGER")));
  assert.ok(changed.every(checksum => !migrationChecksums(Buffer.from(lf)).includes(checksum)));
  assert.deepEqual(expectedMigrations().map(migration => migration.name), [
    "20261011000000_initial", "20261013120000_guest_checkout_consent",
  ]);
});

test("Render startup initializes only with explicit production activation, and never starts API after failure", async () => {
  const { EventEmitter } = require("node:events");
  const { initializationEnabled, start } = require("../scripts/start-production.cjs");
  assert.equal(initializationEnabled({}), false);
  assert.throws(() => initializationEnabled({ BAMORA_INITIALIZE_DATABASE: "yes" }));
  assert.throws(() => initializationEnabled({ BAMORA_INITIALIZE_DATABASE: "true", NODE_ENV: "production" }));
  const env = { NODE_ENV: "production", BAMORA_INITIALIZE_DATABASE: "true", BAMORA_EXPECTED_DATABASE_PROJECT: "nmhccvyjttluanarixvu" };
  const calls = [];
  const launch = () => { calls.push("api"); const child = new EventEmitter(); child.kill = () => {}; return child; };
  const child = await start(env, async args => { assert.deepEqual(args, ["--initialize"]); calls.push("migration"); }, launch);
  assert.deepEqual(calls, ["migration", "api"]);
  child.emit("exit", 0, null);
  await assert.rejects(() => start(env, async () => { throw new Error("blocked"); }, () => { throw new Error("Must not launch"); }), /blocked/);
  const ordinary = await start({}, async () => { throw new Error("Must not migrate"); }, launch);
  ordinary.emit("exit", 0, null);
});

test("initial migration checks are read-only and stop on existing objects or denied permissions", async () => {
  const statements = [];
  function client(objects, granted = true) {
    return { $transaction: async callback => callback({
      $executeRawUnsafe: async sql => statements.push(sql),
      $queryRawUnsafe: async sql => {
        statements.push(sql);
        return sql.includes("pg_catalog.pg_class") ? objects : [{ can_use: granted, can_create: granted }];
      },
    }) };
  }
  assert.equal((await checkDatabase(client([]))).tlsConnectionSucceeded, true);
  assert.equal(statements[0], "SET TRANSACTION READ ONLY");
  assert.ok(statements.every(sql => !/\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b/.test(sql)));
  await assert.rejects(() => checkDatabase(client([{ relname: "categories" }])), /PUBLIC_SCHEMA_NOT_EMPTY/);
  await assert.rejects(() => checkDatabase(client([], false)), /MIGRATION_SCHEMA_PERMISSION_REQUIRED/);
});

test("actual startup process exits before API or database access for invalid activation", () => {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, [path.join(__dirname, "../scripts/start-production.cjs")], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: "", BAMORA_INITIALIZE_DATABASE: "invalid", NODE_ENV: "production" },
    timeout: 10000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Production start blocked: INVALID_INITIAL_DATABASE_ACTIVATION/);
  assert.equal(result.stdout, "");
});
