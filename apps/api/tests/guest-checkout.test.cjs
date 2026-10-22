require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Module, ValidationPipe } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { Prisma } = require("@prisma/client");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { CommerceService } = require("../dist/services/commerce.service");
const { CatalogController } = require("../dist/controllers/catalog.controller");
const { GuestCheckoutDto } = require("../dist/controllers/guest-checkout.dto");

const request = {
  name: "Test Recipient",
  phone: "0501234567",
  email: "recipient@example.invalid",
  city: "Test City",
  street: "Test Street",
  shippingZoneId: "zone-1",
  items: [{ productId: "product-1", size: "M", color: "Black", quantity: 2 }],
};

function checkoutFixture() {
  const writes = [];
  const variant = {
    id: "variant-1",
    size: "M",
    color: "Black",
    price: new Prisma.Decimal(25),
    inventory: { quantity: 10, reserved: 0 },
    product: {
      status: "PUBLISHED",
      merchantId: "merchant-1",
      titleAr: "Test product",
      images: [],
    },
  };
  const unexpected = async () => { throw new Error("Guest checkout must not use customer accounts or carts."); };
  const create = (table, result = {}) => async ({ data }) => {
    writes.push({ table, data });
    return { id: `${table}-1`, ...data, ...result };
  };
  const tx = {
    customer: { findUnique: unexpected },
    cart: { findFirst: unexpected },
    shippingZone: { findFirst: async () => ({ id: "zone-1", code: "IL", baseRate: new Prisma.Decimal(5) }) },
    productVariant: { findFirst: async () => variant },
    order: { create: create("order") },
    orderItem: { create: create("orderItem") },
    inventory: {
      updateMany: async (args) => { writes.push({ table: "inventory", args }); return { count: 1 }; },
      findUnique: async () => ({ quantity: 8 }),
    },
    merchant: { findUnique: async () => ({ id: "merchant-1", businessName: "Test merchant", userId: "merchant-user" }) },
    inventoryAlert: { create: create("inventoryAlert") },
    payment: { create: create("payment") },
    notification: { create: unexpected },
    emailNotification: { create: create("emailNotification") },
    cartItem: { deleteMany: unexpected },
  };
  const repository = {
    ensureOrderItemImageSnapshotColumn: async () => {},
    ensureMerchantSubOrderAttentionStateColumn: async () => {},
    hasMerchantPlanTable: async () => false,
    hasPostgresType: async () => false,
    runInTransaction: async (callback) => callback(tx),
  };
  const gateway = {
    assertEnabled() {},
    createPaymentIntent: async () => ({
      provider: "MANUAL",
      status: "PENDING",
      externalId: "payment-test",
    }),
  };
  return { service: new CommerceService(repository, gateway), writes, tx, gateway };
}

test("guest checkout uses server prices and stock, records contact email, and creates no account", async () => {
  const { service, writes } = checkoutFixture();
  const receipt = await service.guestCheckout({ ...request, total: 1, customerId: "untrusted" });
  assert.equal(receipt.total, "55.00");
  assert.ok(receipt.orderNumber.startsWith("BMO-"));
  assert.equal(writes.find((write) => write.table === "order").data.customerId, null);
  assert.equal(writes.find((write) => write.table === "order").data.shippingName, request.name);
  assert.equal(writes.find((write) => write.table === "emailNotification").data.toEmail, request.email);
  const stock = writes.find((write) => write.table === "inventory").args;
  assert.equal(stock.where.quantity.gte, request.items[0].quantity);
  assert.equal(stock.data.quantity.decrement, request.items[0].quantity);
});

test("guest checkout rejects duplicate options, inactive stock, and unknown shipping zones", async () => {
  const duplicate = checkoutFixture();
  await assert.rejects(() => duplicate.service.guestCheckout({ ...request, items: [...request.items, ...request.items] }), /Duplicate/);

  const noStock = checkoutFixture();
  noStock.tx.inventory.updateMany = async () => ({ count: 0 });
  await assert.rejects(() => noStock.service.guestCheckout(request), /Insufficient stock/);

  const noZone = checkoutFixture();
  noZone.tx.shippingZone.findFirst = async () => null;
  await assert.rejects(() => noZone.service.guestCheckout(request), /shipping zone/);
});

test("guest checkout keeps the payment-disabled guard before any database writes", async () => {
  const fixture = checkoutFixture();
  fixture.gateway.assertEnabled = () => { throw new Error("Payments are disabled."); };
  await assert.rejects(() => fixture.service.guestCheckout(request), /Payments are disabled/);
  assert.equal(fixture.writes.length, 0);
});

test("guest checkout DTO requires valid contact details and bounded item quantities", async () => {
  assert.equal((await validate(plainToInstance(GuestCheckoutDto, request))).length, 0);
  assert.ok((await validate(plainToInstance(GuestCheckoutDto, { ...request, email: "invalid" }))).length > 0);
  for (const quantity of [0, -1, 21, 1.5]) {
    assert.ok((await validate(plainToInstance(GuestCheckoutDto, {
      ...request,
      items: [{ ...request.items[0], quantity }],
    }))).length > 0);
  }
});

test("public checkout endpoint validates delivery data and returns the service receipt", async () => {
  let submitted;
  const service = {
    searchProducts: async () => [],
    publicShippingZones: async () => [{ id: "zone-1", code: "IL", baseRate: 5 }],
    guestCheckout: async (body) => {
      submitted = body;
      return { id: "order-1", orderNumber: "BMO-test", status: "pending" };
    },
  };
  class TestModule {}
  Module({
    controllers: [CatalogController],
    providers: [{ provide: CommerceService, useValue: service }],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const zones = await fetch(`${base}/api/catalog/shipping-zones`);
    assert.equal(zones.status, 200);
    assert.deepEqual(await zones.json(), [{ id: "zone-1", code: "IL", baseRate: 5 }]);

    const invalid = await fetch(`${base}/api/catalog/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...request, email: "not-an-email" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(submitted, undefined);

    const response = await fetch(`${base}/api/catalog/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: "order-1", orderNumber: "BMO-test", status: "pending" });
    assert.equal(submitted.email, request.email);
    assert.equal(submitted.items[0].quantity, request.items[0].quantity);
  } finally {
    await app.close();
  }
});
