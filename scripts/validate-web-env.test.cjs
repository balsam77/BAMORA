const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateWebEnvironment } = require("./validate-web-env.cjs");

test("public HTTPS environment passes without credentials", () => {
  assert.doesNotThrow(() => validateWebEnvironment({ NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com" }));
});

test("missing or local or non-HTTPS API URL is rejected", () => {
  for (const value of [undefined, "http://api.example.com", "https://localhost", "https://api.example.com?token=example"]) {
    assert.throws(() => validateWebEnvironment({ NEXT_PUBLIC_BAMORA_API_URL: value }));
  }
});

test("public passwords and demo authentication are rejected", () => {
  const base = { NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com" };
  assert.throws(() => validateWebEnvironment({ ...base, NEXT_PUBLIC_BAMORA_ADMIN_PASSWORD: "test-only" }));
  assert.throws(() => validateWebEnvironment({ ...base, NEXT_PUBLIC_ENABLE_DEMO_MODE: "1" }));
});

test("review deployment rejects payment activation", () => {
  assert.throws(() => validateWebEnvironment({
    NEXT_PUBLIC_BAMORA_API_URL: "https://api.example.com",
    NEXT_PUBLIC_PAYMENTS_ENABLED: "1",
  }), /disabled/);
});
