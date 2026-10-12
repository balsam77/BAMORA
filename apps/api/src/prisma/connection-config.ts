import { StartupFailure, validateDatabaseConfiguration } from "../common/startup-diagnostics";

export function prismaConnectionUrl(env: Record<string, string | undefined> = process.env) {
  validateDatabaseConfiguration(env);
  const value = env.DATABASE_URL;
  if (!value) {
    throw new StartupFailure("database-configuration", "DATABASE_URL_MISSING_OR_INVALID");
  }
  const url = new URL(value);
  if (env.NODE_ENV !== "production") {
    return value;
  }
  const sessionPooler = url.hostname.endsWith(".pooler.supabase.com");
  if (sessionPooler && url.port && url.port !== "5432") {
    throw new StartupFailure("database-configuration", "SUPABASE_SESSION_PORT_REQUIRED");
  }
  if (url.hash) {
    throw new StartupFailure("database-configuration", "DATABASE_URL_INVALID_FORMAT");
  }
  if (sessionPooler && url.searchParams.has("host")) {
    throw new StartupFailure("database-configuration", "SUPABASE_SOCKET_OVERRIDE_UNSUPPORTED");
  }
  const parameters = new URLSearchParams(url.search);
  parameters.set("sslmode", "require");
  parameters.set("sslaccept", "strict");
  // Keep credentials and the database path byte-for-byte; normalize only parameters.
  return `${value.split("?")[0]}?${parameters.toString()}`;
}
