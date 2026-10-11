import { isAbsolute, resolve } from "path";

type Environment = Record<string, string | undefined>;

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
