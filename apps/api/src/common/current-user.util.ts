export function resolveUserId(raw?: string) {
  return raw && raw.trim() ? raw.trim() : "usr-1";
}
