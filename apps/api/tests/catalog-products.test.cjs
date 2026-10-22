require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Module } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { CatalogController } = require("../dist/controllers/catalog.controller");
const { CommerceService } = require("../dist/services/commerce.service");

test("public catalog products route uses published-product search without database or payment writes", async () => {
  const queries = [];
  let rows = [];
  const service = new CommerceService({
    db: { product: { findMany: async query => { queries.push(query); return rows; } } },
  }, {});
  class FixtureModule {}
  Module({
    controllers: [CatalogController],
    providers: [{ provide: CommerceService, useValue: service }],
  })(FixtureModule);
  const app = await NestFactory.create(FixtureModule, { logger: false });
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const empty = await fetch(`${base}/api/catalog/products`);
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), []);
    assert.equal(queries[0].where.status, "PUBLISHED");
    assert.equal(queries[0].where.OR, undefined);

    rows = [{
      id: "fixture-product", titleAr: "Fixture product", descriptionAr: "Test description", createdAt: "2026-10-17T00:00:00.000Z",
      images: [{ url: "https://example.invalid/product.jpg" }],
      categories: [{ category: { parentId: null, nameAr: "Test category" } }],
      variants: [{ price: 25, color: "black", size: "M", inventory: { quantity: 3 } }],
    }];
    const found = await fetch(`${base}/api/catalog/products?q=Fixture`);
    assert.equal(found.status, 200);
    assert.deepEqual(await found.json(), [{
      id: "fixture-product", name: "Fixture product", detail: "Test description", price: "25.00", stock: 3,
      colors: ["black"], sizes: ["M"], image: "https://example.invalid/product.jpg",
      images: ["https://example.invalid/product.jpg"], category: "Test category",
      createdAt: "2026-10-17T00:00:00.000Z",
    }]);
    assert.equal(queries[1].where.status, "PUBLISHED");
    assert.equal(queries[1].where.OR[0].titleAr.contains, "Fixture");

    const invalid = await fetch(`${base}/api/catalog/products?q=first&q=second`);
    assert.equal(invalid.status, 400);
    assert.equal(queries.length, 2);
  } finally {
    await app.close();
  }
});
