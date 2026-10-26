require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { storeProductImage, supabaseImageObjectPath } = require("../dist/services/image-storage");
const { supabaseStorageConfig } = require("../dist/common/deployment-config");
const { CommerceService } = require("../dist/services/commerce.service");

test("Supabase images use server-only credentials, generated paths and fail explicitly", async () => {
  const names = ["UPLOAD_STORAGE", "SUPABASE_URL", "SUPABASE_STORAGE_BUCKET", "SUPABASE_SERVICE_ROLE_KEY"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = global.fetch;
  Object.assign(process.env, {
    UPLOAD_STORAGE: "supabase", SUPABASE_URL: "https://testproject.supabase.co",
    SUPABASE_STORAGE_BUCKET: "product-images", SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
  });
  const calls = [];
  const file = {
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=", "base64"),
    mimetype: "image/png", originalname: "../../untrusted.html",
  };
  try {
    global.fetch = async (url, options) => { calls.push({ url, options }); return new Response("{}", { status: 200 }); };
    const image = await storeProductImage(file);
    assert.equal(image.provider, "supabase");
    assert.match(image.filename, /^[0-9a-f-]{36}\.png$/);
    assert.ok(image.url.startsWith("https://testproject.supabase.co/storage/v1/object/public/product-images/products/"));
    assert.equal(image.key, undefined);
    assert.equal(calls[0].options.headers.Authorization, "Bearer test-only-key");
    assert.equal(calls[0].options.headers["x-upsert"], "false");
    assert.equal(supabaseImageObjectPath(image.url), `products/${image.filename}`);
    assert.equal(supabaseImageObjectPath(image.url + "?extra=1"), null);
    assert.equal(supabaseImageObjectPath(image.url.replace("testproject", "otherproject")), null);
    const commerce = new CommerceService({}, {});
    assert.deepEqual(commerce.requireAtLeastOneImage([image.url]), [image.url]);
    await assert.rejects(() => storeProductImage({ ...file, mimetype: "image/svg+xml" }), /Only PNG/);
    await assert.rejects(() => storeProductImage({ ...file, buffer: Buffer.from("not an image") }), /Only PNG/);
    global.fetch = async () => new Response("private provider details", { status: 403 });
    await assert.rejects(() => storeProductImage(file), /Image storage rejected/);
    global.fetch = async () => { throw new Error("secret provider URL"); };
    await assert.rejects(() => storeProductImage(file), /Image upload failed/);
    assert.throws(() => supabaseStorageConfig({ SUPABASE_URL: "http://bad", SUPABASE_STORAGE_BUCKET: "images", SUPABASE_SERVICE_ROLE_KEY: "key" }), /HTTPS/);
    assert.throws(() => supabaseStorageConfig({}), /server-only/);
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
