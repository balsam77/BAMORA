const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateWebEnvironment } = require("./validate-web-env.cjs");

test("public HTTPS environment passes without credentials", () => {
  assert.doesNotThrow(() => validateWebEnvironment({ NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com" }));
});

test("missing or local or non-HTTPS API URL is rejected", () => {
  for (const value of [undefined, "http://api.example.com", "https://localhost", "https://api.example.com?token=example"]) {
    assert.throws(() => validateWebEnvironment({ NEXT_PUBLIC_BAMORA_API_URL: value }));
  }
});

test("public passwords and demo authentication are rejected", () => {
  const base = { NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com" };
  assert.throws(() => validateWebEnvironment({ ...base, NEXT_PUBLIC_BAMORA_ADMIN_PASSWORD: "test-only" }));
  assert.throws(() => validateWebEnvironment({ ...base, NEXT_PUBLIC_ENABLE_DEMO_MODE: "1" }));
});

test("review deployment rejects payment activation", () => {
  assert.throws(() => validateWebEnvironment({
    NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com",
    NEXT_PUBLIC_PAYMENTS_ENABLED: "1",
  }), /disabled/);
});

test("build validator loads Next production files, preserves process precedence and withholds secrets", () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "bamora-web-env-test-"));
  const nextDirectory = path.dirname(require.resolve("next/package.json", {
    paths: [path.join(__dirname, "../apps/customer")],
  }));
  const environment = { ...process.env, NODE_ENV: "production" };
  for (const key of Object.keys(environment)) {
    if (key.startsWith("NEXT_PUBLIC_") || key === "__NEXT_PROCESSED_ENV") delete environment[key];
  }
  fs.mkdirSync(path.join(fixture, "node_modules"));
  const link = path.join(fixture, "node_modules/next");
  fs.symlinkSync(nextDirectory, link, process.platform === "win32" ? "junction" : "dir");
  const run = (extra = {}) => spawnSync(process.execPath, [path.join(__dirname, "validate-web-env.cjs")], {
    cwd: fixture,
    env: { ...environment, ...extra },
    encoding: "utf8",
    timeout: 15000,
  });
  try {
    const missing = run();
    assert.ifError(missing.error);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /NEXT_PUBLIC_BAMORA_API_URL is required/);
    fs.writeFileSync(path.join(fixture, ".env.production"), "NEXT_PUBLIC_BAMORA_API_URL=https://bamora-api.onrender.com\n");
    const configured = run();
    assert.ifError(configured.error);
    assert.equal(configured.status, 0, configured.stderr);
    assert.ok(!configured.stdout.includes("bamora-api.onrender.com"));
    const override = run({ NEXT_PUBLIC_BAMORA_API_URL: "http://localhost:4001" });
    assert.equal(override.status, 1);
    assert.ok(!override.stderr.includes("localhost:4001"));
    const secret = run({ NEXT_PUBLIC_TEST_SECRET: "synthetic-private-build-value" });
    assert.equal(secret.status, 1);
    assert.match(secret.stderr, /Do not expose credentials/);
    assert.ok(!secret.stderr.includes("synthetic-private-build-value"));
  } finally {
    fs.unlinkSync(link);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("all Vercel frontends use the same validated build entrypoint", () => {
  for (const app of ["customer", "merchant", "admin", "business"]) {
    const directory = path.join(__dirname, "../apps", app);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
    const vercel = JSON.parse(fs.readFileSync(path.join(directory, "vercel.json"), "utf8"));
    assert.equal(manifest.scripts.build, "node ../../scripts/validate-web-env.cjs && next build");
    assert.equal(vercel.buildCommand, "pnpm build");
  }
  const turbo = JSON.parse(fs.readFileSync(path.join(__dirname, "../turbo.json"), "utf8"));
  assert.ok(turbo.tasks.build.env.includes("NEXT_PUBLIC_BAMORA_API_URL"));
  assert.ok(turbo.tasks.build.passThroughEnv.includes("NEXT_PUBLIC_*"));
});
