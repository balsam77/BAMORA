const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { verify } = require("../scripts/verify-render-database.cjs");
const { Prisma } = require("@prisma/client");

test("Render verification uses only supplied input and rejects mismatched project before creating a client", async () => {
  const caFile = path.join(require("node:os").tmpdir(), `bamora-render-ca-${process.pid}.crt`);
  const { X509Certificate } = require("node:crypto");
  fs.writeFileSync(caFile, require("node:tls").rootCertificates.find(pem => {
    const ca = new X509Certificate(pem);
    return ca.ca && Date.parse(ca.validFrom) <= Date.now() && Date.parse(ca.validTo) > Date.now();
  }));
  const input = {
    databaseUrl: "postgresql://postgres.nmhccvyjttluanarixvu:fixture@aws-0-test.pooler.supabase.com:5432/postgres",
    caFile,
  };
  try {
    await assert.rejects(() => verify({ ...input, databaseUrl: "postgresql://different.example/postgres" },
      () => { throw new Error("Must not create client"); }), /SUPABASE_PROJECT_MISMATCH/);
    const statements = [];
    let disconnected = false;
    const result = await verify(input, options => {
      assert.equal(new URL(options.datasourceUrl).searchParams.get("sslcert"), caFile);
      assert.equal(new URL(options.datasourceUrl).searchParams.get("sslaccept"), "strict");
      return {
        $transaction: async action => action({
          $executeRawUnsafe: async sql => statements.push(sql),
          $queryRawUnsafe: async sql => {
            statements.push(sql);
            if (sql.includes("pg_catalog.pg_class")) return [];
            if (sql.includes("to_regclass")) return [{ exists: false }];
            return [{ connected: 1 }];
          },
        }),
        $disconnect: async () => { disconnected = true; },
      };
    });
    assert.equal(result.projectMatches, true);
    assert.equal(result.postgresQuerySucceeded, true);
    assert.equal(result.allRequiredTablesAndColumnsReadable, false);
    assert.equal(result.missingTables.length, Prisma.dmmf.datamodel.models.length);
    assert.ok(result.missingTables.includes("categories"));
    assert.equal(statements[0], "SET TRANSACTION READ ONLY");
    assert.ok(statements.every(sql => !/\b(INSERT|DELETE|UPDATE|CREATE|ALTER|DROP|TRUNCATE)\b/.test(sql)));
    assert.equal(disconnected, true);
    assert.ok(!JSON.stringify(result).includes("fixture"));
  } finally {
    fs.unlinkSync(caFile);
  }
});

test("Windows launcher passes secrets through stdin only and never loads dotenv or migration code", () => {
  const launcher = fs.readFileSync(path.join(__dirname, "../scripts/verify-render-database.ps1"), "utf8");
  const worker = fs.readFileSync(path.join(__dirname, "../scripts/verify-render-database.cjs"), "utf8");
  assert.match(launcher, /Read-Host.*-AsSecureString/);
  assert.match(launcher, /StandardInput\.WriteLine/);
  assert.match(launcher, /ZeroFreeBSTR/);
  assert.doesNotMatch(worker, /dotenv|migrate-production|migrate deploy|process\.env\.DATABASE_URL/);
  assert.doesNotMatch(launcher, /Set-Content|Out-File|Set-Clipboard|\$env:DATABASE_URL/);
});
