const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { startupStep, startupStepAsync, startupFailureMessage, validateDatabaseConfiguration } = require("../dist/common/startup-diagnostics");
const { PrismaService } = require("../dist/prisma/prisma.service");
const { getJwtSecret, getCorsOrigins } = require("../dist/common/deployment-config");

const privateDetails = "private-password private-token private-host";

test("nested Prisma causes preserve certificate failure details without credentials or stack", async () => {
  const previous = process.env.DIAGNOSTIC_CAUSE_SECRET;
  process.env.DIAGNOSTIC_CAUSE_SECRET = "synthetic-cause-credential";
  try {
    const cause = Object.assign(new Error(
      "TLS certificate verification failed: self-signed certificate; synthetic-cause-credential",
    ), { errorCode: "P1011" });
    const original = new Error("Prisma initialization failed", { cause });
    cause.cause = original;
    await assert.rejects(() => startupStepAsync("database-connection", async () => {
      throw original;
    }), (error) => {
      assert.equal(error, original);
      const output = startupFailureMessage(error);
      assert.match(output, /stage=database-connection/);
      assert.match(output, /cause\[1\]=code=P1011; type=Error; message=TLS certificate verification failed: self-signed certificate/);
      assert.ok(!output.includes("synthetic-cause-credential"));
      assert.ok(!output.includes("cause[2]"));
      assert.ok(!output.includes("at TestContext"));
      return true;
    });
  } finally {
    if (previous === undefined) delete process.env.DIAGNOSTIC_CAUSE_SECRET;
    else process.env.DIAGNOSTIC_CAUSE_SECRET = previous;
  }
});

test("startup diagnostics preserve the failing phase and only allow known error codes", async () => {
  for (const [stage, code] of [["database-connection", "P1001"], ["upload-directory", "EACCES"], ["http-listen", "EADDRINUSE"]]) {
    await assert.rejects(
      () => startupStepAsync(stage, async () => { throw Object.assign(new Error(privateDetails), { code }); }),
      (error) => {
        const output = startupFailureMessage(error);
        assert.match(output, new RegExp(`stage=${stage}; code=${code}`));
        assert.ok(!output.includes(privateDetails));
        return true;
      },
    );
  }
  const output = startupFailureMessage({ message: privateDetails, code: privateDetails, stack: privateDetails });
  assert.match(output, /UNCLASSIFIED/);
  assert.ok(!output.includes(privateDetails));
});

test("nested startup steps retain the database phase, not the outer listen phase", async () => {
  await assert.rejects(
    () => startupStepAsync("http-listen", () => PrismaService.prototype.onModuleInit.call({
      $connect: async () => { throw { errorCode: "P1000", message: privateDetails }; },
    })),
    (error) => {
      assert.match(startupFailureMessage(error), /stage=database-connection; code=P1000/);
      return true;
    },
  );
});

test("missing or invalid database configuration fails without exposing the supplied value", () => {
  for (const value of [undefined, "", privateDetails, "https://private-host/database"]) {
    assert.throws(() => validateDatabaseConfiguration({ DATABASE_URL: value }), (error) => {
      assert.equal(error.stage, "database-configuration");
      assert.ok(!error.message.includes(privateDetails));
      return true;
    });
  }
  assert.doesNotThrow(() => validateDatabaseConfiguration({ DATABASE_URL: "postgresql://example.invalid/database" }));
});

test("JWT and CORS failures are classified without exposing invalid settings", () => {
  assert.throws(() => startupStep("jwt-initialization", () => getJwtSecret({ NODE_ENV: "production", JWT_SECRET: "private-token" })), (error) => {
    assert.match(startupFailureMessage(error), /stage=jwt-initialization/);
    return true;
  });
  assert.throws(() => startupStep("configuration", () => getCorsOrigins({ NODE_ENV: "production", CORS_ORIGINS: privateDetails })), (error) => {
    const output = startupFailureMessage(error);
    assert.match(output, /stage=configuration/);
    assert.ok(!output.includes(privateDetails));
    return true;
  });

  test("original exception identity, type and useful message survive while secrets are redacted", async () => {
    const previous = { DATABASE_URL: process.env.DATABASE_URL, DIAGNOSTIC_TEST_KEY: process.env.DIAGNOSTIC_TEST_KEY };
    process.env.DATABASE_URL = "postgresql://test-user:encoded%40credential@db.example.invalid/database";
    process.env.DIAGNOSTIC_TEST_KEY = "test-private-key-value";
    const original = Object.assign(new TypeError(
      "Connection refused at db.example.invalid using encoded@credential and test-private-key-value",
    ), { code: "P1001" });
    try {
      await assert.rejects(() => startupStepAsync("http-listen", () =>
        startupStepAsync("database-connection", async () => { throw original; }),
      ), (error) => {
        assert.equal(error, original);
        const output = startupFailureMessage(error);
        assert.match(output, /stage=database-connection; code=P1001; type=TypeError/);
        assert.match(output, /message=Connection refused/);
        for (const secret of ["db.example.invalid", "encoded@credential", "encoded%40credential", "test-private-key-value", process.env.DATABASE_URL]) {
          assert.ok(!output.includes(secret));
        }
        assert.ok(!output.includes("at TestContext"));
        return true;
      });
      for (const message of [
        "Cannot reach postgresql://some-user:some-pass@some-host/database",
        "Authorization: Bearer arbitrary-credential",
        "password=arbitrary-credential",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        "ghp_examplecredential1234567890",
      ]) {
        const output = startupFailureMessage(new Error(message));
        assert.ok(!output.includes("some-pass"));
        assert.ok(!output.includes("postgresql://"));
        assert.ok(!output.includes("arbitrary-credential"));
        assert.ok(!output.includes("eyJhbGci"));
        assert.ok(!output.includes("ghp_"));
      }
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  test("real Nest bootstrap reports sanitized JWT and database failures without connecting", () => {
    const script = `
      require("reflect-metadata");
      const { ConfigModule } = require("@nestjs/config");
      const original = ConfigModule.forRoot.bind(ConfigModule);
      ConfigModule.forRoot = (options) => original({ ...options, ignoreEnvFile: true });
      const { PrismaService } = require("./dist/prisma/prisma.service");
      PrismaService.prototype.$connect = async () => {
        throw Object.assign(new Error("${privateDetails}"), { errorCode: process.env.DIAGNOSTIC_TEST_CODE });
      };
      require("./dist/main");
    `;
    const cases = [
      { secret: "private-token", stage: "jwt-initialization", code: "UNCLASSIFIED" },
      ...["P1000", "P1001", "P1011", "P1008"].map(code => ({
        secret: "x".repeat(32), stage: "database-connection", code,
      })),
      { secret: "x".repeat(32), stage: "database-configuration", code: "DATABASE_URL_MISSING_OR_INVALID", database: "" },
      { secret: "x".repeat(32), stage: "database-configuration", code: "DATABASE_URL_INVALID_FORMAT", database: "not-a-connection-url" },
      { secret: "x".repeat(32), stage: "configuration", code: "UNCLASSIFIED", origins: "" },
    ];
    for (const { secret, stage, code, database, origins } of cases) {
      const result = spawnSync(process.execPath, ["-e", script], {
        cwd: path.join(__dirname, ".."),
        encoding: "utf8",
        timeout: 15000,
        env: {
          ...process.env,
          NODE_ENV: "production",
          JWT_SECRET: secret,
          DATABASE_URL: database ?? "postgresql://example.invalid/database",
          CORS_ORIGINS: origins ?? "https://shop.example.com",
          DIAGNOSTIC_TEST_CODE: code,
          UPLOAD_STORAGE: "disabled",
          PAYMENTS_ENABLED: "false",
        },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      const logs = result.stdout + result.stderr;
      assert.match(logs, new RegExp(`API startup failed; stage=${stage}; code=${code}`));
      assert.ok(!logs.includes(privateDetails));
      assert.ok(!logs.includes("postgresql://example.invalid/database"));
      assert.ok(!logs.includes(secret));
    }
  });
});
