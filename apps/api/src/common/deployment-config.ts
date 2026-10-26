import { isAbsolute, resolve } from "path";

type Environment = Record<string, string | undefined>;

export function uploadStorageMode(env: Environment = process.env) {
  const storage = env.UPLOAD_STORAGE ?? (env.NODE_ENV === "production" ? "disabled" : "local");
  if (storage !== "disabled" && storage !== "local" && storage !== "supabase") {
    throw new Error("UPLOAD_STORAGE must be disabled, local or supabase.");
  }
  return storage;
}

export function localUploadsEnabled(env: Environment = process.env) {
  return uploadStorageMode(env) === "local";
}

export function supabaseStorageConfig(env: Environment = process.env) {
  const url = env.SUPABASE_URL?.trim();
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !bucket || !key) {
    throw new Error("Supabase image storage requires server-only SUPABASE_URL, SUPABASE_STORAGE_BUCKET and SUPABASE_SERVICE_ROLE_KEY.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project origin.");
  }
  if (parsed.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) ||
      parsed.origin !== url || parsed.username || parsed.password || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket)) {
    throw new Error("Supabase storage requires a project HTTPS origin and a valid bucket name.");
  }
  return { url, bucket, key };
}

export function getUploadsDirectory(env: Environment = process.env) {
  const configured = env.UPLOAD_DIR?.trim();
  if (env.NODE_ENV === "production" && (!configured || !isAbsolute(configured))) {
    throw new Error("UPLOAD_DIR must be an absolute persistent-disk path in production.");
  }
  return resolve(configured || "uploads");
}

export function getCorsOrigins(env: Environment = process.env) {
  const production = env.NODE_ENV === "production";
  const origins = env.CORS_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (production && origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain the exact BAMORA HTTPS origins in production.");
  }
  if (!production && origins.length === 0) {
    return [3000, 3001, 3002, 3003].flatMap((port) => [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]);
  }
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password || url.hostname.includes("*") ||
        (production ? url.protocol !== "https:" : !["http:", "https:"].includes(url.protocol))) {
      throw new Error("CORS_ORIGINS entries must be exact origins without paths, credentials or wildcards.");
    }
  }
  return [...new Set(origins)];
}

export function getJwtSecret(env: Environment = process.env) {
  const secret = env.JWT_SECRET;
  if (env.NODE_ENV === "production" && (!secret || secret.length < 32 || secret === "bamora-dev-secret")) {
    throw new Error("JWT_SECRET must be a strong secret of at least 32 characters in production.");
  }
  return secret || "bamora-dev-secret";
}

export function paymentsEnabled(env: Environment = process.env) {
  const enabled = env.PAYMENTS_ENABLED;
  if (enabled !== undefined && enabled !== "true" && enabled !== "false") {
    throw new Error("PAYMENTS_ENABLED must be true or false.");
  }
  return enabled === "true" || (enabled === undefined && env.NODE_ENV !== "production");
}

export function getPort(env: Environment = process.env) {
  const port = Number(env.PORT ?? 4001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }
  return port;
}
