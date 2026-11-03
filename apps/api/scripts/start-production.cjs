const path = require("node:path");
const { spawn } = require("node:child_process");
const migrate = args => require("./migrate-production.cjs").main(args);
const { StartupFailure } = require("../dist/common/startup-diagnostics");

function initializationEnabled(env) {
  const value = env.BAMORA_INITIALIZE_DATABASE;
  if (value === undefined || value === "false") return false;
  if (value !== "true" || env.NODE_ENV !== "production") {
    throw new StartupFailure("database-configuration", "INVALID_INITIAL_DATABASE_ACTIVATION");
  }
  if (env.BAMORA_EXPECTED_DATABASE_PROJECT !== "nmhccvyjttluanarixvu") {
    throw new StartupFailure("database-configuration", "EXPECTED_SUPABASE_PROJECT_MISMATCH");
  }
  return true;
}

async function start(env = process.env, initialize = migrate, launch = spawn) {
  if (initializationEnabled(env)) {
    await initialize(["--initialize"]);
  } else if (env.NODE_ENV === "production" && env.DATABASE_URL) {
    // Apply any pending migrations (e.g. new columns) before starting.
    // This is safe: migrate deploy only applies unapplied migrations.
    const { spawnSync } = require("node:child_process");
    const cli = require.resolve("prisma/build/index.js");
    const result = spawnSync(process.execPath, [cli, "migrate", "deploy", "--schema", path.join(__dirname, "../prisma/schema.prisma")], {
      env: { ...env, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 60000,
    });
    if (result.error || result.status !== 0) {
      console.error("Migration deploy failed; starting anyway (schema may be behind).");
    }
  }
  const child = launch(process.execPath, [path.join(__dirname, "../dist/main.js")], {
    stdio: "inherit", env,
  });
  const terminate = signal => { child.kill(signal); };
  const onTerm = () => terminate("SIGTERM");
  const onInt = () => terminate("SIGINT");
  process.on("SIGTERM", onTerm);
  process.on("SIGINT", onInt);
  child.on("error", () => {
    console.error("API process could not start; sensitive details withheld.");
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.removeListener("SIGTERM", onTerm);
    process.removeListener("SIGINT", onInt);
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  return child;
}

module.exports = { initializationEnabled, start };
if (require.main === module) start().catch(error => {
  const code = error?.safeCode;
  console.error(`Production start blocked: ${typeof code === "string" && /^[A-Z0-9_]+$/.test(code)
    ? code : "INITIALIZATION_FAILED_DETAILS_WITHHELD"}`);
  process.exitCode = 1;
});
