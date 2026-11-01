const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function platformFixture(responder) {
  const calls = [];
  const storage = new Map([["bamoraUserRole", "customer"]]);
  const sessionStorage = new Map();
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/index.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports, Headers, FormData, URL, Date, Intl,
    window: { localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    }, sessionStorage: {
      getItem: (key) => sessionStorage.get(key) ?? null,
      setItem: (key, value) => sessionStorage.set(key, value),
    } },
    require: () => ({ getApiBaseUrl: () => "https://api.example.invalid", getDataSourceMode: () => "api" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(responder(url, options)), { headers: { "content-type": "application/json" } });
    },
  });
  return { api: exports, calls, storage, sessionStorage };
}

test("guest browsing uses public catalog without token or fabricated profile", async () => {
  const { api, calls } = platformFixture(() => [{
    id: "real-product-id", name: "Test Product", price: "25.00", category: "Test Category",
    images: [], sizes: ["M"], colors: ["black"],
  }]);
  assert.equal(api.hasCustomerSession(), false);
  const products = await api.getPublicProducts("shirt");
  assert.equal(products[0].id, "real-product-id");
  assert.ok(calls[0].url.endsWith("/api/catalog/products?q=shirt"));
  assert.equal(calls[0].options.headers.has("authorization"), false);
  assert.equal(products[0].colors[0], "black");
});

test("guest name uses only session storage and never creates authentication or a profile", () => {
  const { api, calls, storage, sessionStorage } = platformFixture(() => []);
  assert.equal(api.saveGuestName("  Test Visitor  "), "Test Visitor");
  assert.equal(api.readGuestName(), "Test Visitor");
  assert.equal(sessionStorage.get("bamoraGuestName"), "Test Visitor");
  assert.equal(api.hasCustomerSession(), false);
  assert.equal(storage.size, 1);
  assert.equal(calls.length, 0);
  assert.throws(() => api.saveGuestName(" "), /80/);
});

test("guest cart retains multiple variants, merges quantities and enforces server item limits", () => {
  const { api } = platformFixture(() => []);
  const item = { productId: "product", quantity: 1, size: "M", color: "black" };
  const one = api.addGuestCartItem([], item);
  const two = api.addGuestCartItem(one, { ...item, productId: "other" });
  const merged = api.addGuestCartItem(two, item);
  assert.equal(one[0].quantity, 1);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].quantity, 2);
  assert.throws(() => api.addGuestCartItem(merged, { ...item, quantity: 20 }));
  assert.throws(() => api.addGuestCartItem(merged, { ...item, quantity: 0 }));
  const full = Array.from({ length: 30 }, (_, index) => ({ ...item, productId: `test-${index}` }));
  assert.throws(() => api.addGuestCartItem(full, item));
});

test("legacy customer login keeps the original email and phone normalization", () => {
  const { api } = platformFixture(() => []);
  assert.equal(api.legacyCustomerPassword(" Test@Example.Invalid ", "050-123-4567"),
    "bamora-test@example.invalid-01234567");
});

test("guest purchase submits only selected items and shipping data without login", async () => {
  const { api, calls } = platformFixture(() => ({ id: "order", orderNumber: "BMO-test", total: "30.00", payment: { status: "PENDING" } }));
  const input = {
    name: "Test Recipient", phone: "0501234567", city: "Test City", street: "Test Street",
    shippingZoneId: "zone", items: [{ productId: "product", quantity: 1, color: "black", size: "M" }],
  };
  const receipt = await api.checkoutAsGuest(input);
  assert.equal(receipt.orderNumber, "BMO-test");
  assert.equal(calls[0].options.headers.has("authorization"), false);
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body, input);
  assert.equal(body.email, undefined);
  assert.equal(body.password, undefined);
  assert.equal(body.customerId, undefined);
});

test("optional signup never substitutes a phone or name and carries explicit marketing choice", async () => {
  const { api, calls } = platformFixture((url) => {
    if (url.endsWith("/api/auth/signup")) return { accessToken: "synthetic-test-token", refreshToken: "synthetic-refresh", user: { id: "user", role: "customer" } };
    if (url.endsWith("/api/customer/notifications")) return [];
    return { profile: { id: "user", fullName: "", email: "test@example.invalid", marketingEnabled: false }, addresses: [], products: [] };
  });

  await api.createCustomerRepository("api").signup({ email: "test@example.invalid", password: "test-password", marketingEnabled: false });
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.phone, undefined);
  assert.equal(body.name, undefined);
  assert.equal(body.marketingEnabled, false);
  assert.equal(api.hasCustomerSession(), true);
});

test("guest support records a name and message without requiring an account or reply email", async () => {
  const { api, calls } = platformFixture(() => ({ id: "test-ticket" }));
  const receipt = await api.sendGuestSupport({ name: "Test Name", message: "Test support message" });
  assert.equal(receipt.id, "test-ticket");
  assert.ok(calls[0].url.endsWith("/api/catalog/support"));
  assert.equal(calls[0].options.headers.has("authorization"), false);
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Test Name", message: "Test support message" });
});
