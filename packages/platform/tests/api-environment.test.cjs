const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadEnvironment(env, window) {
  const source = fs.readFileSync(path.join(__dirname, "../src/api-environment.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env }, window, URL });
  return exports;
}

test("production uses configured HTTPS API, not storefront port 4001", () => {
  const api = loadEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com/" },
    { location: { protocol: "https:", hostname: "shop.example.com" } });
  assert.equal(api.getApiBaseUrl(), "https://api.example.com");
});

test("remote frontend without API configuration fails explicitly", () => {
  const api = loadEnvironment({}, { location: { protocol: "https:", hostname: "shop.example.com" } });
  assert.throws(() => api.getApiBaseUrl(), /missing/);
});

test("local development fallback and API data mode are preserved", () => {
  const api = loadEnvironment({ NEXT_PUBLIC_BAMORA_DATA_SOURCE: "api" },
    { location: { protocol: "http:", hostname: "localhost" } });
  assert.equal(api.getApiBaseUrl(), "http://localhost:4001");
  assert.equal(api.getDataSourceMode(), "api");
});

test("production rejects HTTP and credential-bearing API URLs", () => {
  for (const url of ["http://api.example.com", "https://test:test@api.example.com"]) {
    assert.throws(() => loadEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_BAMORA_API_URL: url }).getApiBaseUrl());
  }
});

test("production never falls back to localhost in server or browser contexts", () => {
  for (const window of [undefined, { location: { protocol: "http:", hostname: "localhost" } }]) {
    assert.throws(() => loadEnvironment({ NODE_ENV: "production" }, window).getApiBaseUrl(), /missing/);
  }
  for (const url of ["https://localhost", "https://127.0.0.1", "https://[::1]"]) {
    assert.throws(() => loadEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_BAMORA_API_URL: url }).getApiBaseUrl());
  }
});
