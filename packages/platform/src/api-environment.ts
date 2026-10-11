declare const process: {
  env: {
    NEXT_PUBLIC_BAMORA_API_URL?: string;
    NEXT_PUBLIC_BAMORA_DATA_SOURCE?: string;
    NODE_ENV?: string;
  };
};

export function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BAMORA_API_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        url.search || url.hash || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
      throw new Error("NEXT_PUBLIC_BAMORA_API_URL must be an HTTPS API URL in production, without credentials, query or fragment.");
    }
    return configured.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) {
      throw new Error("NEXT_PUBLIC_BAMORA_API_URL is missing. Configure it before building the application.");
    }
    return `${window.location.protocol}//${window.location.hostname}:4001`;
  }
  return "http://localhost:4001";
}

export function getDataSourceMode() {
  return process.env.NEXT_PUBLIC_BAMORA_DATA_SOURCE === "api" ? "api" : "mock";
}
