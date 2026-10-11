const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const apiRoot = path.resolve(__dirname, "..");
const migrationFile = path.join(apiRoot, "prisma", "migrations", "20261011000000_initial", "migration.sql");
const mode = process.argv[2];
if (!["generate", "validate", "initial", "check"].includes(mode)) {
  throw new Error("Expected generate, validate, initial or check.");
}
if (mode === "initial" && fs.existsSync(migrationFile)) {
  throw new Error("Initial migration already exists; refusing to overwrite it.");
}

// Prisma loads .env beside its schema and working directory. Use an isolated copy.
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "bamora-prisma-offline-"));
const schemaFile = path.join(temporaryDirectory, "schema.prisma");
const packageFile = path.join(temporaryDirectory, "package.json");
const modulesLink = path.join(temporaryDirectory, "node_modules");
try {
  const schema = fs.readFileSync(path.join(apiRoot, "prisma", "schema.prisma"), "utf8");
  if (mode === "generate") {
    fs.writeFileSync(packageFile, JSON.stringify({ name: "bamora-offline-prisma", private: true }));
    fs.symlinkSync(path.join(apiRoot, "node_modules"), modulesLink, process.platform === "win32" ? "junction" : "dir");
  }
  fs.writeFileSync(schemaFile, schema);
  const args = mode === "generate" || mode === "validate"
    ? [mode, "--schema", schemaFile]
    : ["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaFile, "--script"];
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), ...args], {
    cwd: temporaryDirectory,
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://offline:offline@127.0.0.1:1/offline?schema=public",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      CHECKPOINT_DISABLE: "1",
      PRISMA_GENERATE_SKIP_AUTOINSTALL: "1",
    },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Offline Prisma ${mode} failed:\n${result.stderr || result.stdout}`);
  }
  if (mode === "initial") {
    fs.mkdirSync(path.dirname(migrationFile), { recursive: true });
    fs.writeFileSync(migrationFile, result.stdout, { flag: "wx" });
  } else if (mode === "check") {
    const normalize = (sql) => sql.replace(/\r\n/g, "\n").trim();
    if (normalize(fs.readFileSync(migrationFile, "utf8")) !== normalize(result.stdout)) {
      throw new Error("Initial migration differs from schema.prisma. Review the schema and migration history.");
    }
  }
} finally {
  if (fs.existsSync(schemaFile)) fs.unlinkSync(schemaFile);
  if (fs.existsSync(modulesLink)) fs.unlinkSync(modulesLink);
  if (fs.existsSync(packageFile)) fs.unlinkSync(packageFile);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.rmdirSync(temporaryDirectory);
      break;
    } catch (error) {
      if (!["EBUSY", "EPERM", "ENOTEMPTY"].includes(error.code) || attempt >= 10) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
}
console.log(`Offline Prisma ${mode} succeeded; no database connection was made.`);
