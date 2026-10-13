import { StartupFailure, validateDatabaseConfiguration } from "../common/startup-diagnostics";
import { readFileSync } from "fs";
import { isAbsolute } from "path";
import { X509Certificate } from "crypto";

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
  const certificateFile = env.DATABASE_SSL_CA_FILE?.trim();
  if (certificateFile) {
    if (!isAbsolute(certificateFile)) {
      throw new StartupFailure("database-configuration", "DATABASE_CA_PATH_MUST_BE_ABSOLUTE");
    }
    let certificate: string;
    try {
      certificate = readFileSync(certificateFile, "utf8");
    } catch {
      throw new StartupFailure("database-configuration", "DATABASE_CA_FILE_UNREADABLE");
    }
    try {
      const certificates = certificate.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
      if (!certificates?.length || certificate.includes("PRIVATE KEY")) throw new Error("Invalid CA file");
      for (const pem of certificates) {
        const ca = new X509Certificate(pem);
        if (!ca.ca || Date.parse(ca.validFrom) > Date.now() || Date.parse(ca.validTo) <= Date.now()) {
          throw new Error("Invalid CA certificate");
        }
      }
    } catch {
      throw new StartupFailure("database-configuration", "DATABASE_CA_CERTIFICATE_INVALID");
    }
    for (const parameter of ["sslcert", "sslrootcert"]) {
      const existing = parameters.get(parameter);
      if (existing && existing !== certificateFile) {
        throw new StartupFailure("database-configuration", "DATABASE_CA_CONFIGURATION_CONFLICT");
      }
    }
    parameters.set("sslcert", certificateFile);
  }
  parameters.set("sslmode", "require");
  parameters.set("sslaccept", "strict");
  // Keep credentials and the database path byte-for-byte; normalize only parameters.
  return `${value.split("?")[0]}?${parameters.toString()}`;
}
