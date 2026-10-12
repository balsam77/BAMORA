export type StartupStage =
  | "application-initialization"
  | "configuration"
  | "jwt-initialization"
  | "upload-directory"
  | "database-configuration"
  | "database-connection"
  | "http-listen";

const safeCodes = new Set(["P1000", "P1001", "P1002", "P1003", "P1008", "P1009", "P1010", "P1011", "P1012", "P1013", "P1014", "P1015", "P1016", "P1017", "EACCES", "EPERM", "ENOENT", "ENOSPC", "EROFS", "EADDRINUSE"]);

export class StartupFailure extends Error {
  constructor(readonly stage: StartupStage, readonly safeCode: string) {
    super(`API startup failed; stage=${stage}; code=${safeCode}. Check the corresponding server configuration.`);
  }
}

const stages = new WeakMap<object, StartupStage>();

function rememberStage(stage: StartupStage, error: unknown) {
  if (typeof error === "object" && error !== null && !stages.has(error)) {
    stages.set(error, stage);
  }
}

function redact(text: string) {
  const values = new Set<string>();
  for (const value of Object.values(process.env)) {
    if (!value) continue;
    values.add(value);
    try {
      const url = new URL(value);
      for (const part of [url.username, url.password, url.hostname]) {
        if (!part) continue;
        values.add(part);
        values.add(decodeURIComponent(part));
      }
      for (const part of url.searchParams.values()) {
        if (part) values.add(part);
      }
    } catch {
      // Non-URL values are still redacted in full.
    }
  }
  let result = text
    .replace(/-----BEGIN [^\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^\r\n]*PRIVATE KEY-----/g, "[REDACTED]")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi, "[REDACTED_URL]")
    .replace(/^.*(?:DATABASE_URL|password|passwd|secret|token|authorization|api[_ -]?key|connection[_ -]?string)\b.*$/gim, "[REDACTED_SENSITIVE_LINE]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(?:ghp_|github_pat_|sk_live_|sk_test_|AKIA)[A-Za-z0-9_]+/g, "[REDACTED_KEY]");
  for (const value of [...values].sort((a, b) => b.length - a.length)) {
    result = result.split(value).join("[REDACTED]");
  }
  return result
    .replace(/[\r\n\u0000-\u001f\u007f]/g, " ")
    .slice(0, 2000);
}

export function startupFailureMessage(error: unknown) {
  const stage = error instanceof StartupFailure
    ? error.stage
    : typeof error === "object" && error !== null
      ? stages.get(error) ?? "application-initialization"
      : "application-initialization";
  let code: unknown;
  if (error instanceof StartupFailure) code = error.safeCode;
  else if (typeof error === "object" && error !== null) {
    if ("errorCode" in error && typeof error.errorCode === "string" && safeCodes.has(error.errorCode)) code = error.errorCode;
    else if ("code" in error) code = error.code;
  }
  const safeCode = error instanceof StartupFailure
    ? error.safeCode
    : typeof code === "string" && safeCodes.has(code) ? code : "UNCLASSIFIED";
  const type = error instanceof Error ? redact(error.name) : "UnknownError";
  const message = error instanceof Error ? redact(error.message) : "Non-Error exception details withheld.";
  const causes: string[] = [];
  const seen = new Set<unknown>([error]);
  let current = error;
  while (current instanceof Error && "cause" in current && causes.length < 3) {
    const cause: unknown = current.cause;
    if (!(cause instanceof Error) || seen.has(cause)) break;
    seen.add(cause);
    const causeCode = "errorCode" in cause && typeof cause.errorCode === "string" && safeCodes.has(cause.errorCode)
      ? cause.errorCode
      : "code" in cause && typeof cause.code === "string" && safeCodes.has(cause.code)
        ? cause.code
        : "UNCLASSIFIED";
    causes.push(`code=${causeCode}; type=${redact(cause.name)}; message=${redact(cause.message)}`);
    current = cause;
  }
  return `API startup failed; stage=${stage}; code=${safeCode}; type=${type}; message=${message}${causes.map((cause, index) => `; cause[${index + 1}]=${cause}`).join("")}`;
}

export function startupStep<T>(stage: StartupStage, action: () => T): T {
  try {
    return action();
  } catch (error) {
    rememberStage(stage, error);
    throw error;
  }
}

export async function startupStepAsync<T>(stage: StartupStage, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    rememberStage(stage, error);
    throw error;
  }
}

export function validateDatabaseConfiguration(env: Record<string, string | undefined> = process.env) {
  const value = env.DATABASE_URL;
  if (!value || value.trim() !== value) {
    throw new StartupFailure("database-configuration", "DATABASE_URL_MISSING_OR_INVALID");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new StartupFailure("database-configuration", "DATABASE_URL_INVALID_FORMAT");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) {
    throw new StartupFailure("database-configuration", "DATABASE_URL_INVALID_FORMAT");
  }
}
