const { test } = require("node:test");
const assert = require("node:assert/strict");
const { prismaConnectionUrl } = require("../dist/prisma/connection-config");

test("production Supabase Session Pooler requires TLS and strict certificate checking", () => {
  const base = "postgresql://test.project:encoded%40test@aws-0-test.pooler.supabase.com:5432/postgres";
  for (const query of ["", "?sslmode=disable&sslaccept=accept_invalid_certs", "?sslmode=prefer&sslmode=disable"]) {
    const env = { NODE_ENV: "production", DATABASE_URL: base + query };
    const before = env.DATABASE_URL;
    const actual = prismaConnectionUrl(env);
    assert.equal(actual.split("?")[0], base);
    const parsed = new URL(actual);
    assert.deepEqual(parsed.searchParams.getAll("sslmode"), ["require"]);
    assert.deepEqual(parsed.searchParams.getAll("sslaccept"), ["strict"]);
    assert.equal(env.DATABASE_URL, before);
  }
});

test("connection preserves certificates, schema, limits and encoded credentials", () => {
  const value = "postgresql://test.project:encoded%40test@aws-0-test.pooler.supabase.com:5432/postgres?schema=public&sslrootcert=%2Fetc%2Fcert.pem&connection_limit=3&connect_timeout=15";
  const actual = prismaConnectionUrl({ NODE_ENV: "production", DATABASE_URL: value });
  const url = new URL(actual);
  assert.equal(url.password, "encoded%40test");
  assert.equal(url.searchParams.get("sslrootcert"), "/etc/cert.pem");
  assert.equal(url.searchParams.get("connection_limit"), "3");
  assert.equal(url.searchParams.get("connect_timeout"), "15");
  assert.equal(url.searchParams.get("schema"), "public");
  assert.equal(prismaConnectionUrl({ NODE_ENV: "production", DATABASE_URL: actual }), actual);
});

test("Session Pooler rejects a transaction port or socket override without revealing the URL", () => {
  for (const value of [
    "postgresql://test:private-value@aws-0-test.pooler.supabase.com:6543/postgres",
    "postgresql://test:private-value@aws-0-test.pooler.supabase.com:5432/postgres?host=private-host",
  ]) {
    assert.throws(() => prismaConnectionUrl({ NODE_ENV: "production", DATABASE_URL: value }), error => {
      assert.equal(error.stage, "database-configuration");
      assert.ok(!error.message.includes("private-value"));
      assert.ok(!error.message.includes("private-host"));
      return true;
    });
  }
});

test("all production PostgreSQL connections require verified TLS while development stays unchanged", () => {
  const value = "postgresql://example.invalid/database";
  const production = new URL(prismaConnectionUrl({ NODE_ENV: "production", DATABASE_URL: value }));
  assert.equal(production.searchParams.get("sslmode"), "require");
  assert.equal(production.searchParams.get("sslaccept"), "strict");
  assert.equal(prismaConnectionUrl({ NODE_ENV: "development", DATABASE_URL: value }), value);
  const pooler = "postgresql://aws-0-test.pooler.supabase.com/postgres";
  assert.equal(prismaConnectionUrl({ DATABASE_URL: pooler }), pooler);
  assert.throws(() => prismaConnectionUrl({}), /DATABASE_URL_MISSING_OR_INVALID/);
});

test("installed Prisma Client accepts the configured datasourceUrl without connecting", async () => {
  const { PrismaService } = require("../dist/prisma/prisma.service");
  const previous = { NODE_ENV: process.env.NODE_ENV, DATABASE_URL: process.env.DATABASE_URL };
  let client;
  try {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://test.project:encoded%40test@aws-0-test.pooler.supabase.com:5432/postgres";
    client = new PrismaService();
    assert.equal(typeof client.$connect, "function");
    assert.equal(typeof client.onModuleInit, "function");
    // Constructing and disconnecting an unused client do not call $connect.
    await client.$disconnect();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
