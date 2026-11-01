require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Module, ValidationPipe } = require("@nestjs/common");
const { NestFactory } = require("@nestjs/core");
const { CatalogController } = require("../dist/controllers/catalog.controller");
const { CommerceService } = require("../dist/services/commerce.service");
const { HealthController } = require("../dist/controllers/health.controller");
const { PrismaService } = require("../dist/prisma/prisma.service");
const { HttpExceptionFilter } = require("../dist/common/filters/http-exception.filter");
const { Prisma } = require("@prisma/client");

test("actual Nest public catalog routes validate searches and report schema failures without fake data", async () => {
  let schemaMissing = false;
  let searchCalls = 0;
  const categories = [{ id: "fixture-category", titleAr: "Fixture", slug: "fixture", parentId: null }];
  const product = { id: "fixture-product", name: "Fixture", price: "25.00", stock: 3 };
  const unavailable = () => {
    throw new Prisma.PrismaClientKnownRequestError("private database details", {
      code: "P2021", clientVersion: Prisma.prismaVersion.client,
    });
  };
  class TestModule {}
  Module({
    controllers: [CatalogController, HealthController],
    providers: [
      { provide: CommerceService, useValue: {
        listPublicCategories: async () => schemaMissing ? unavailable() : categories,
        searchProducts: async filters => {
          searchCalls++;
          assert.equal(typeof filters.q, "string");
          return schemaMissing ? unavailable() : [product];
        },
      } },
      { provide: PrismaService, useValue: { $queryRawUnsafe: async () => schemaMissing ? unavailable() : [1] } },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  try {
    await app.listen(0, "127.0.0.1");
    const base = await app.getUrl();
    const categoryResponse = await fetch(`${base}/api/catalog/categories`);
    assert.equal(categoryResponse.status, 200);
    assert.deepEqual(await categoryResponse.json(), categories);
    const products = await fetch(`${base}/api/catalog/products?q=fixture`);
    assert.equal(products.status, 200);
    assert.deepEqual(await products.json(), [product]);
    const callsBefore = searchCalls;
    assert.equal((await fetch(`${base}/api/catalog/products?q=${"x".repeat(201)}`)).status, 400);
    assert.equal((await fetch(`${base}/api/catalog/products?q=a&q=b`)).status, 400);
    assert.equal(searchCalls, callsBefore);
    assert.equal((await fetch(`${base}/api/catalog/not-a-route`)).status, 404);
    schemaMissing = true;
    for (const route of ["catalog/categories", "catalog/products", "health/ready"]) {
      const response = await fetch(`${base}/api/${route}`);
      assert.equal(response.status, 503, route);
      assert.ok(!(await response.text()).includes("private database details"));
    }
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
  } finally {
    await app.close();
  }
});
