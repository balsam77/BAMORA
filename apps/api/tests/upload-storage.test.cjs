const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { configureHttpInfrastructure } = require("../dist/common/http-infrastructure");

test("disabled storage starts without creating directories or serving local files", async () => {
  const previous = Object.fromEntries(["NODE_ENV", "UPLOAD_STORAGE", "UPLOAD_DIR", "CORS_ORIGINS"].map(key => [key, process.env[key]]));
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "bamora-no-upload-test-"));
  const directory = path.join(parent, "must-not-be-created");
  try {
    process.env.NODE_ENV = "production";
    delete process.env.UPLOAD_STORAGE;
    process.env.UPLOAD_DIR = directory;
    process.env.CORS_ORIGINS = "https://shop.example.com";
    let cors;
    await configureHttpInfrastructure({
      enableCors(options) { cors = options; },
      useStaticAssets() { throw new Error("Disabled storage must not serve local files"); },
    });
    assert.deepEqual(cors, { origin: ["https://shop.example.com"] });
    await assert.rejects(() => fs.access(directory), { code: "ENOENT" });
    process.env.UPLOAD_DIR = "invalid-relative-path";
    await configureHttpInfrastructure({
      enableCors() {},
      useStaticAssets() { throw new Error("Unexpected local storage access"); },
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fs.rm(parent, { recursive: true, force: true });
  }
});
