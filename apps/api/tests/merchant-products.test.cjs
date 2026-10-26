require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { CommerceService } = require("../dist/services/commerce.service");
const { CommerceRepository } = require("../dist/repositories/commerce.repository");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { MerchantProductDto } = require("../dist/controllers/merchant-product.dto");

const input = {
  name: "Test product", description: "Real product description", category: "Clothes", subCategory: "Shirts",
  stock: 3, price: "49.90", images: ["/uploads/test.png"], sizes: ["S", "M"], colors: ["Black", "White"],
};

test("merchant product saves actual category links, description and every size/color option", async () => {
  let saved;
  const repository = new CommerceRepository({
    product: { create: async args => { saved = args.data; return { id: "product-1", ...args.data }; } },
  });
  repository.listCategories = async () => [
    { id: "root", nameAr: "Clothes", parentId: null },
    { id: "child", nameAr: "Shirts", parentId: "root" },
  ];
  repository.createMerchantActivityLog = async () => ({});
  const service = new CommerceService(repository, {});
  service.resolveMerchantId = async () => "merchant-1";
  await service.merchantUpsertProduct(input);
  assert.equal(saved.merchantId, "merchant-1");
  assert.equal(saved.descriptionAr, input.description);
  assert.deepEqual(saved.categories.create, [{ categoryId: "root" }, { categoryId: "child" }]);
  assert.equal(saved.variants.create.length, 4);
  assert.deepEqual(saved.variants.create.map(variant => `${variant.size}/${variant.color}`), ["S/Black", "S/White", "M/Black", "M/White"]);
  assert.ok(saved.variants.create.every(variant => variant.inventory.create.quantity === 3));
  await assert.rejects(() => service.merchantUpsertProduct({ ...input, category: "Missing" }), /existing category/);
  await assert.rejects(() => service.merchantUpsertProduct({ ...input, subCategory: "Missing" }), /matching subcategory/);
});

test("merchant product validation rejects malformed inventory, prices and oversized fields", async () => {
  assert.equal((await validate(plainToInstance(MerchantProductDto, input))).length, 0);
  for (const change of [{ stock: -1 }, { stock: 1.5 }, { price: "NaN" }, { price: "-5" }, { images: [] }, { category: "" }]) {
    assert.ok((await validate(plainToInstance(MerchantProductDto, { ...input, ...change }))).length > 0);
  }
});

test("product updates preserve existing variants, reserved inventory and merchant ownership", async () => {
  let saved;
  const variants = input.sizes.flatMap(size => input.colors.map(color => ({ size, color, inventory: { reserved: 2 } })));
  const service = new CommerceService({
    listCategories: async () => [{ id: "root", nameAr: "Clothes", parentId: null }, { id: "child", nameAr: "Shirts", parentId: "root" }],
    findProductById: async () => ({ merchantId: "merchant-1", variants, images: [{ url: input.images[0] }] }),
    createOrUpdateProduct: async value => { saved = value; return { id: "product-1" }; },
    createMerchantActivityLog: async () => ({}),
  }, {});
  service.resolveMerchantId = async () => "merchant-1";
  await service.merchantUpsertProduct({ ...input, id: "product-1" });
  assert.equal(saved.description, input.description);
  await assert.rejects(() => service.merchantUpsertProduct({ ...input, id: "product-1", stock: 1 }), /reserved/);
  await assert.rejects(() => service.merchantUpsertProduct({ ...input, id: "product-1", colors: ["Red"] }), /options cannot be replaced/);
  service.resolveMerchantId = async () => "other-merchant";
  await assert.rejects(() => service.merchantUpsertProduct({ ...input, id: "product-1" }), /Product not found/);
});
