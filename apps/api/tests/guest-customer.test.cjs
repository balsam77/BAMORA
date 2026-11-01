require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Module, ValidationPipe } = require("@nestjs/common");
const { NestFactory, Reflector } = require("@nestjs/core");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { Prisma } = require("@prisma/client");
const { CatalogController } = require("../dist/controllers/catalog.controller");
const { CustomerController } = require("../dist/controllers/customer.controller");
const { CommerceService } = require("../dist/services/commerce.service");
const { CommerceRepository } = require("../dist/repositories/commerce.repository");
const { RolesGuard } = require("../dist/common/roles.guard");
const { SignupDto } = require("../dist/auth/auth.dto");
const { AuthService } = require("../dist/auth/auth.service");
const { GuestCheckoutDto } = require("../dist/controllers/guest-checkout.dto");
const { configureHttpInfrastructure } = require("../dist/common/http-infrastructure");
const bcrypt = require("bcrypt");
const { createHash } = require("node:crypto");

const input = {
  name: "Test Recipient", phone: "0501234567", email: "recipient@example.invalid", city: "Test City", street: "Test Street",
  shippingZoneId: "zone", items: [{ productId: "product", size: "M", color: "black", quantity: 2 }],
};

function checkoutFixture() {
  const writes = [];
  const variant = {
    id: "variant", size: "M", color: "black", price: new Prisma.Decimal(25),
    inventory: { quantity: 10 }, product: { status: "PUBLISHED", merchantId: "merchant", titleAr: "Test Product", images: [] },
  };
  const unexpected = async () => { throw new Error("Guest must not create or access an account"); };
  const create = (table, result = {}) => async ({ data }) => { writes.push({ table, data }); return { id: table, ...data, ...result }; };
  const tx = {
    customer: { findUnique: unexpected },
    cart: { findFirst: unexpected },
    shippingZone: { findUnique: async () => ({ id: "zone", code: "IL", baseRate: new Prisma.Decimal(5) }) },
    productVariant: { findFirst: async () => variant },
    order: { create: create("order") }, orderItem: { create: create("item") },
    inventory: { updateMany: async (args) => { writes.push({ table: "inventory", args }); return { count: 1 }; }, findUnique: async () => ({ quantity: 8 }) },
    merchant: { findUnique: async () => ({ id: "merchant", businessName: "Test Merchant", userId: "merchant-user" }) },
    inventoryAlert: { create: create("alert") },
    payment: { create: create("payment") },
    notification: { create: unexpected }, emailNotification: { create: create("emailNotification") }, cartItem: { deleteMany: unexpected },
  };
  const repository = {
    findCustomerByUserId: unexpected,
    ensureOrderItemImageSnapshotColumn: async () => {},
    ensureMerchantSubOrderAttentionStateColumn: async () => {},
    hasMerchantPlanTable: async () => false, hasPostgresType: async () => false,
    runInTransaction: async (fn) => fn(tx),
  };
  const gateway = {
    assertEnabled() {},
    createPaymentIntent: async () => ({ provider: "MANUAL", status: "PENDING", externalId: "test", checkoutUrl: undefined }),
  };
  return { service: new CommerceService(repository, gateway), repository, tx, gateway, writes };
}

test("guest checkout uses server prices, reserves stock and creates an unowned order without fake identity", async () => {
  const { service, writes } = checkoutFixture();
  const receipt = await service.guestCheckout({ ...input, total: 1, customerId: "victim" });
  assert.equal(receipt.total, "55.00");
  assert.ok(receipt.orderNumber.startsWith("BMO-"));
  const order = writes.find(({ table }) => table === "order").data;
  assert.equal(order.customerId, null);
  assert.equal(order.shippingName, input.name);
  assert.equal(order.shippingPhone, input.phone);
  const emailNotification = writes.find(({ table }) => table === "emailNotification").data;
  assert.equal(emailNotification.toEmail, input.email);
  assert.match(emailNotification.body, new RegExp(input.name));
  const stock = writes.find(({ table }) => table === "inventory").args;
  assert.equal(stock.where.quantity.gte, 2);
  assert.equal(stock.data.quantity.decrement, 2);
});

test("cart removal and address update scope database writes to the authenticated owner", async () => {
  let cartWhere;
  let addressWhere;
  const repository = new CommerceRepository({
    cartItem: { deleteMany: async ({ where }) => { cartWhere = where; return { count: 0 }; } },
    address: { update: async ({ where }) => { addressWhere = where; return {}; } },
  });
  repository.findCustomerByUserId = async () => ({ id: "owner-customer" });
  const service = new CommerceService(repository, {});
  assert.equal(await service.removeCartItem("foreign-item", { sub: "owner-user" }), false);
  assert.deepEqual(cartWhere, { id: "foreign-item", cart: { customerId: "owner-customer" } });
  await repository.upsertAddress({
    id: "address", customerId: "owner-customer", city: "Test", street: "Test Street",
    phone: "0501234567", shippingZoneId: "zone", isDefault: false,
  });
  assert.deepEqual(addressWhere, { id: "address", customerId: "owner-customer" });
});

test("foreign address is rejected before changing defaults or writing customer data", async () => {
  const unexpected = () => { throw new Error("Unexpected customer mutation"); };
  const service = new CommerceService({
    findCustomerByUserId: async () => ({ id: "owner-customer" }),
    db: { address: { findFirst: async ({ where }) => {
      assert.deepEqual(where, { id: "foreign-address", customerId: "owner-customer" });
      return null;
    } } },
    unsetDefaultAddresses: unexpected,
    upsertAddress: unexpected,
    customerDashboard: unexpected,
  }, {});
  await assert.rejects(() => service.upsertAddress({ id: "foreign-address", isDefault: true }, { sub: "owner-user" }), /Address not found/);
});

test("account cart rejects invalid quantities and unknown options before mutation", async () => {
  const unexpected = () => { throw new Error("Unexpected cart mutation"); };
  const service = new CommerceService({
    findCustomerByUserId: async () => ({ id: "customer" }),
    ensureCart: unexpected,
    upsertCartItem: unexpected,
    listProductVariants: async () => [{ id: "variant", size: "M", color: "black", inventory: { quantity: 10 } }],
  }, {});
  for (const quantity of [-1, 0, 1.5, 21]) {
    await assert.rejects(() => service.addToCart({ ...input.items[0], quantity }, { sub: "user" }), /Quantity/);
  }
  await assert.rejects(() => service.addToCart({ ...input.items[0], size: "unavailable" }, { sub: "user" }), /variant not found/);
});

test("multi-item guest checkout preserves distinct suborder lines and active merchant eligibility", async () => {
  const fixture = checkoutFixture();
  fixture.repository.hasMerchantPlanTable = async () => true;
  fixture.repository.hasPostgresType = async () => true;
  const originalVariant = await fixture.tx.productVariant.findFirst();
  fixture.tx.productVariant.findFirst = async ({ where }) => ({ ...originalVariant, id: `variant-${where.productId}` });
  fixture.tx.orderItem.create = async ({ data }) => ({ id: `item-${data.variantId}`, ...data });
  const lines = [];
  fixture.tx.merchant.findUnique = async () => ({
    id: "merchant", businessName: "Test Merchant", userId: "merchant-user",
    plan: { approvalStatus: "ACTIVE", selectedPlan: "MONTHLY_SUBSCRIPTION", subscriptionPaymentStatus: "ACTIVE" },
  });
  fixture.tx.merchantSubOrder = { create: async ({ data }) => {
    assert.equal(data.subtotal.toString(), "75");
    return { id: "suborder", ...data };
  } };
  fixture.tx.subOrderItem = { create: async ({ data }) => { lines.push(data); return data; } };
  fixture.tx.merchantActivityLog = { create: async () => ({}) };
  const receipt = await fixture.service.guestCheckout({
    ...input, items: [...input.items, { ...input.items[0], productId: "other", quantity: 1 }],
  });
  assert.equal(receipt.total, "80.00");
  assert.deepEqual(lines.map(line => line.orderItemId), ["item-variant-product", "item-variant-other"]);
  assert.deepEqual(lines.map(line => line.quantity), [2, 1]);
});

test("public product search filters unpublished products and inactive merchants without exposing account fields", async () => {
  let query;
  const service = new CommerceService({ db: { product: { findMany: async (input) => {
    query = input;
    return [{ id: "test-product", titleAr: "Test", createdAt: new Date(), variants: [{
      price: new Prisma.Decimal(25), color: "black", size: "M", inventory: { quantity: 2 },
    }], images: [], categories: [] }];
  } } } }, {});
  const products = await service.searchProducts({ q: "test" });
  assert.equal(query.where.status, "PUBLISHED");
  assert.deepEqual(query.where.merchant, { status: "ACTIVE" });
  assert.equal(query.where.OR[0].titleAr.contains, "test");
  assert.equal(products[0].price, "25.00");
  assert.equal(products[0].customer, undefined);
  assert.equal(products[0].user, undefined);
});

test("guest checkout rejects unavailable stock, duplicate variants and unknown delivery zones", async () => {
  const fixture = checkoutFixture();
  fixture.tx.inventory.updateMany = async () => ({ count: 0 });
  await assert.rejects(() => fixture.service.guestCheckout(input), /Insufficient stock/);
  const duplicate = checkoutFixture();
  await assert.rejects(() => duplicate.service.guestCheckout({ ...input, items: [...input.items, ...input.items] }), /Duplicate/);
  const noZone = checkoutFixture();
  noZone.tx.shippingZone.findUnique = async () => null;
  await assert.rejects(() => noZone.service.guestCheckout(input), /shipping zone/);
});

test("guest checkout respects previously reserved inventory", async () => {
  const fixture = checkoutFixture();
  fixture.tx.productVariant.findFirst = async () => ({
    id: "variant", price: new Prisma.Decimal(25), inventory: { quantity: 3, reserved: 2 },
    product: { status: "PUBLISHED", merchantId: "merchant", titleAr: "Test Product", images: [] },
  });
  await assert.rejects(() => fixture.service.guestCheckout(input), /Insufficient stock/);
});

test("authenticated checkout preserves customer ownership and private cart flow", async () => {
  const fixture = checkoutFixture();
  fixture.repository.findCustomerByUserId = async (userId) => {
    assert.equal(userId, "user");
    return { id: "customer" };
  };
  fixture.tx.customer.findUnique = async () => ({
    id: "customer", userId: "user", user: { firstName: "Test", lastName: "Name", email: "test@example.invalid" },
  });
  fixture.tx.cart.findFirst = async () => ({
    id: "cart", items: [{
      id: "cart-item", quantity: 2, variantId: "variant",
      variant: await fixture.tx.productVariant.findFirst(),
    }],
  });
  fixture.tx.notification.create = async () => ({});
  fixture.tx.emailNotification.create = async () => ({});
  fixture.tx.cartItem.deleteMany = async ({ where }) => {
    assert.deepEqual(where, { cartId: "cart" });
  };
  const receipt = await fixture.service.checkout({ sub: "user", role: "customer" }, input);
  assert.equal(receipt.total, "55.00");
  assert.equal(fixture.writes.find(({ table }) => table === "order").data.customerId, "customer");
});

test("guest support creates a private admin ticket without an account or invented contact", async () => {
  let saved;
  const service = new CommerceService({
    createNotification: async (data) => { saved = data; return { id: "ticket" }; },
  }, {});
  assert.deepEqual(await service.guestSupport({ name: "Test Name", message: "Test message" }), { id: "ticket" });
  assert.equal(saved.type, "SUPPORT");
  assert.equal(saved.userId, undefined);
  assert.equal(saved.body, "Test message");
});

test("guest checkout preserves the payment-disabled gate before database or provider calls", async () => {
  const fixture = checkoutFixture();
  fixture.gateway.assertEnabled = () => { throw new Error("Payments are disabled"); };
  await assert.rejects(() => fixture.service.guestCheckout(input), /Payments are disabled/);
  assert.equal(fixture.writes.length, 0);
});

test("guest inputs reject missing delivery fields and zero, negative or excessive quantities", async () => {
  assert.equal((await validate(plainToInstance(GuestCheckoutDto, input))).length, 0);
  assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...input, email: undefined }))).length > 0);
  assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...input, email: "not-an-email" }))).length > 0);
  for (const quantity of [0, -1, 21, 1.5]) {
    assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...input, items: [{ ...input.items[0], quantity }] }))).length > 0);
  }
  assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...input, phone: undefined }))).length > 0);
  for (const phone of ["()()()()", "123", "00000000000000000000"]) {
    assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...input, phone }))).length > 0);
  }
});

test("optional signup needs no name or phone and defaults marketing consent off", async () => {
  const dto = plainToInstance(SignupDto, { email: "test@example.invalid", password: "test-only-password" });
  assert.equal((await validate(dto)).length, 0);
  let saved;
  const service = new AuthService({ signAsync: async () => "test-only-token" }, {
    findUserByEmail: async () => null,
    createUser: async (data) => { saved = data; return { id: "user", email: data.email, role: data.role }; },
    createRefreshToken: async () => {},
  });
  await service.signup(dto);
  assert.equal(saved.phone, undefined);
  assert.equal(saved.firstName, "");
  assert.equal(saved.marketingEnabled, false);
  assert.equal(await bcrypt.compare(dto.password, saved.passwordHash), true);
});

test("customer login accepts historical SHA-256 and bcrypt accounts without rewriting stored credentials", async () => {
  const password = "synthetic-test-password";
  let hash = createHash("sha256").update(password).digest("hex");
  let sessions = 0;
  const repository = {
    findUserByEmail: async () => ({
      id: "test-user", email: "test@example.invalid", role: "CUSTOMER", status: "ACTIVE", passwordHash: hash,
    }),
    revokeAllRefreshTokensForUser: async () => {},
    createRefreshToken: async () => { sessions++; },
    createUser: () => { throw new Error("Must not recreate existing accounts"); },
  };
  const service = new AuthService({ signAsync: async () => "synthetic-test-token" }, repository);
  for (const storedHash of [hash, await bcrypt.hash(password, 4)]) {
    hash = storedHash;
    const result = await service.login({ email: "test@example.invalid", password });
    assert.equal(result.user.role, "customer");
    assert.equal(hash, storedHash);
    await assert.rejects(() => service.login({ email: "test@example.invalid", password: "wrong-password" }), /Invalid credentials/);
  }
  assert.equal(sessions, 2);
});

test("new optional account can sign in after signup with the chosen password", async () => {
  let stored;
  const service = new AuthService({ signAsync: async () => "synthetic-test-token" }, {
    findUserByEmail: async () => stored,
    createUser: async (input) => {
      stored = { ...input, id: "test-user", status: "ACTIVE" };
      return stored;
    },
    createRefreshToken: async () => {},
    revokeAllRefreshTokensForUser: async () => {},
  });
  const input = { email: "test@example.invalid", password: "synthetic-new-password" };
  await service.signup(input);
  const result = await service.login(input);
  assert.equal(result.user.role, "customer");
});

test("marketing opt-in and unsubscribe are persisted and broadcasts require explicit consent", async () => {
  let setting = { marketingEnabled: false, marketingConsentAt: null };
  let filter;
  const repository = {
    findCustomerByUserId: async () => ({ id: "customer" }),
    db: {
      userSetting: {
        findUnique: async () => setting,
        upsert: async ({ update }) => { setting = update; },
      },
      user: { findMany: async ({ where }) => { filter = where; return []; } },
    },
  };
  const service = new CommerceService(repository, {});
  const user = { sub: "user", role: "customer" };
  await service.updateMarketingPreference(true, user);
  assert.equal(await service.marketingPreference("user"), true);
  await service.updateMarketingPreference(false, user);
  assert.equal(await service.marketingPreference("user"), false);
  setting = { marketingEnabled: true, marketingConsentAt: null };
  assert.equal(await service.marketingPreference("user"), false);
  await service.sendBroadcast({ audience: "customers", title: "Offer", body: "Test" });
  assert.deepEqual(filter.settings, { is: { marketingEnabled: true, marketingConsentAt: { not: null } } });
});

test("anonymous HTTP catalog is public while profiles, orders and authenticated checkout remain protected", async () => {
  const service = {
    searchProducts: async ({ q }) => [{ id: "published", name: q, price: "25.00" }],
    listPublicCategories: async () => [],
    publicShippingZones: async () => [],
    guestCheckout: async (body) => ({ received: body }),
    guestSupport: async (body) => ({ received: body }),
    customerDashboard: async () => { throw new Error("Private data must not be reached"); },
  };
  class TestModule {}
  Module({
    controllers: [CatalogController, CustomerController],
    providers: [{ provide: CommerceService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(new RolesGuard(new Reflector(), {}, {}));
  await app.listen(0, "127.0.0.1");
  const base = await app.getUrl();
  try {
    const publicResponse = await fetch(`${base}/api/catalog/products?q=test`);
    assert.equal(publicResponse.status, 200);
    assert.equal((await publicResponse.json())[0].price, "25.00");
    for (const query of ["q=a&q=b", `q=${"x".repeat(201)}`]) {
      assert.equal((await fetch(`${base}/api/catalog/products?${query}`)).status, 400);
    }
    for (const route of ["profile", "orders", "cart", "notifications"]) {
      assert.equal((await fetch(`${base}/api/customer/${route}`)).status, 403);
    }
    assert.equal((await fetch(`${base}/api/customer/checkout`, { method: "POST" })).status, 403);
    for (const route of ["profile", "marketing"]) {
      assert.equal((await fetch(`${base}/api/customer/${route}`, { method: "PATCH" })).status, 403);
    }
    const response = await fetch(`${base}/api/catalog/checkout`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, customerId: "victim", total: 1 }),
    });

    assert.equal(response.status, 201);
    const received = (await response.json()).received;
    assert.equal(received.customerId, undefined);
    assert.equal(received.total, undefined);
    const invalid = await fetch(`${base}/api/catalog/checkout`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, items: [{ ...input.items[0], quantity: -1 }] }),
    });
    assert.equal(invalid.status, 400);
    const support = await fetch(`${base}/api/catalog/support`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test Name", message: "Test support message", userId: "victim" }),
    });
    assert.equal(support.status, 201);
    assert.equal((await support.json()).received.userId, undefined);
    const invalidSupport = await fetch(`${base}/api/catalog/support`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "   ", message: "Test support message" }),
    });
    assert.equal(invalidSupport.status, 400);
  } finally { await app.close(); }
});

test("HTTP CORS permits only exact configured origins, including authorization preflight", async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, CORS_ORIGINS: process.env.CORS_ORIGINS, UPLOAD_STORAGE: process.env.UPLOAD_STORAGE };
  process.env.NODE_ENV = "production";
  process.env.CORS_ORIGINS = "https://shop.example.invalid";
  process.env.UPLOAD_STORAGE = "disabled";
  class TestModule {}
  Module({ controllers: [CatalogController], providers: [{ provide: CommerceService, useValue: {
    listPublicCategories: async () => [],
  } }] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  try {
    await configureHttpInfrastructure(app);
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const allowed = await fetch(`${base}/api/catalog/categories`, { headers: { origin: "https://shop.example.invalid" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://shop.example.invalid");
    for (const origin of ["https://untrusted.example.invalid", "https://shop.example.invalid.attacker.invalid", "null"]) {
      const denied = await fetch(`${base}/api/catalog/categories`, { headers: { origin } });
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
    }
    const preflight = await fetch(`${base}/api/catalog/checkout`, { method: "OPTIONS", headers: {
      origin: "https://shop.example.invalid",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type,authorization",
    } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-headers"), /authorization/);
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
