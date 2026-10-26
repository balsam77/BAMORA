const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function platformFixture(responder) {
  const calls = [];
  const storage = new Map();
  const sessionStorage = new Map();
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/index.ts"), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports, Headers, FormData, URL, Date, Intl, Response,
    window: {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      },
      sessionStorage: {
        getItem: (key) => sessionStorage.get(key) ?? null,
        setItem: (key, value) => sessionStorage.set(key, value),
      },
    },
    require: () => ({ getApiBaseUrl: () => "https://api.example.invalid", getDataSourceMode: () => "api" }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(responder(url, options)), { headers: { "content-type": "application/json" } });
    },
  });
  return { api: exports, calls, storage };
}

test("anonymous catalog request carries no account credentials and maps product variants", async () => {
  const { api, calls, storage } = platformFixture(() => [{
    id: "product-1",
    name: "Test product",
    detail: "Product details",
    price: "25.00",
    category: "Accessories",
    images: ["https://cdn.example.invalid/product.jpg"],
    sizes: ["M"],
    colors: ["Black"],
  }]);
  const products = await api.getPublicProducts("bag");
  assert.equal(products[0].id, "product-1");
  assert.equal(products[0].detail, "Product details");
  assert.deepEqual(Array.from(products[0].sizes), ["M"]);
  assert.deepEqual(Array.from(products[0].colors), ["Black"]);
  assert.ok(calls[0].url.endsWith("/api/catalog/products?q=bag"));
  assert.equal(calls[0].options.headers.has("authorization"), false);
  assert.equal(storage.size, 0);
});

test("guest cart keeps variant selections, merges quantities and enforces limits", () => {
  const { api } = platformFixture(() => []);
  const selection = { productId: "product-1", quantity: 1, size: "M", color: "Black" };
  const first = api.addGuestCartItem([], selection);
  const second = api.addGuestCartItem(first, { ...selection, productId: "product-2" });
  const merged = api.addGuestCartItem(second, selection);
  assert.equal(first[0].quantity, 1);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].quantity, 2);
  assert.throws(() => api.addGuestCartItem(merged, { ...selection, quantity: 20 }));
  assert.throws(() => api.addGuestCartItem(merged, { ...selection, quantity: 0 }));
  const fullCart = Array.from({ length: 30 }, (_, index) => ({ ...selection, productId: `p-${index}` }));
  assert.throws(() => api.addGuestCartItem(fullCart, selection));
});

test("guest checkout submits only the selected cart and delivery details without authentication", async () => {
  const { api, calls, storage } = platformFixture(() => ({
    id: "order-1",
    orderNumber: "BMO-test",
    total: "30.00",
    payment: { status: "PENDING" },
  }));
  const input = {
    name: "Test Recipient",
    phone: "0501234567",
    email: "recipient@example.invalid",
    city: "Test City",
    street: "Test Street",
    items: [{ productId: "product-1", quantity: 1, size: "M", color: "Black" }],
  };
  const receipt = await api.checkoutAsGuest(input);
  assert.equal(receipt.orderNumber, "BMO-test");
  assert.equal(calls[0].options.headers.has("authorization"), false);
  assert.deepEqual(JSON.parse(calls[0].options.body), input);
  assert.equal(storage.size, 0);
});

test("public delivery policy is requested without authentication", async () => {
  const policy = { countryCode: "IL", ratePerOrder: 70, currency: "ILS", chargeRule: "ONCE_PER_ORDER" };
  const { api, calls } = platformFixture(() => policy);
  assert.deepEqual(JSON.parse(JSON.stringify(await api.getPublicShippingPolicy())), policy);
  assert.ok(calls[0].url.endsWith("/api/catalog/shipping-policy"));
  assert.equal(calls[0].options.headers.has("authorization"), false);
});

test("merchant dashboard preserves categories and description and accepts guest orders", async () => {
  const { api } = platformFixture(() => ({
    merchantId: "merchant-1",
    products: [{
      id: "product-1", titleAr: "Shirt", descriptionAr: "Cotton shirt",
      categories: [
        { category: { nameAr: "Clothes", parentId: null } },
        { category: { nameAr: "Shirts", parentId: "root" } },
      ],
      variants: [
        { price: 25, size: "M", color: "Black", inventory: { quantity: 3 } },
        { price: 25, size: "L", color: "Black", inventory: { quantity: 3 } },
      ],
      images: [],
    }],
    orders: [{
      id: "sub-order-1", status: "PENDING", subtotal: 25,
      createdAt: "2026-10-22T10:00:00Z",
      order: { orderNumber: "BMO-test", customer: null, shippingName: "Guest recipient" },
    }],
  }));
  const dashboard = await api.createMerchantRepository("api").getDashboard();
  assert.equal(dashboard.products[0].category, "Clothes");
  assert.equal(dashboard.products[0].subCategory, "Shirts");
  assert.equal(dashboard.products[0].description, "Cotton shirt");
  assert.equal(dashboard.products[0].quantity, 3);
  assert.equal(dashboard.orders[0].customer, "Guest recipient");
});

test("merchant product requests retain category and description fields", async () => {
  const { api, calls } = platformFixture(() => ({
    id: "product-1", titleAr: "Shirt", variants: [], images: [],
  }));
  const input = {
    name: "Shirt", description: "Cotton", category: "Clothes", subCategory: "Shirts",
    price: "25", quantity: 3, sizes: ["M"], colors: ["Black"], images: ["/uploads/test.png"],
  };
  await api.createMerchantRepository("api").addProduct(input);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.category, input.category);
  assert.equal(body.subCategory, input.subCategory);
  assert.equal(body.description, input.description);
  assert.equal(body.stock, 3);
});
