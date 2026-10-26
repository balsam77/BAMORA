require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const config = require("../dist/common/deployment-config");
const { PaymentGatewayService } = require("../dist/payments/payment-gateway.service");
const { CommerceService } = require("../dist/services/commerce.service");
const { CommerceRepository } = require("../dist/repositories/commerce.repository");
const { HealthController } = require("../dist/controllers/health.controller");
const { AuthService } = require("../dist/auth/auth.service");

test("production merchant login cannot provision or activate accounts", async () => {
  const bcrypt = require("bcrypt");
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const unexpected = () => { throw new Error("Unexpected account mutation"); };
  const repository = {
    findUserByEmail: async () => null,
    createUser: unexpected,
    activateMerchantByUserId: unexpected,
    revokeAllRefreshTokensForUser: unexpected,
  };
  const service = new AuthService({}, repository);
  const dto = { email: "merchant@example.com", password: "test-merchant-password" };
  try {
    await assert.rejects(() => service.merchantLogin(dto), /Invalid credentials/);
    repository.findUserByEmail = async () => ({
      id: "test", email: dto.email, role: "MERCHANT", status: "ACTIVE",
      passwordHash: await bcrypt.hash(dto.password, 4), merchant: { status: "PENDING" },
    });
    await assert.rejects(() => service.merchantLogin(dto), /pending admin approval/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("production admin login ignores development bootstrap and accepts only stored bcrypt credentials", async () => {
  const bcrypt = require("bcrypt");
  const previous = { NODE_ENV: process.env.NODE_ENV, DEV_ADMIN_USERNAME: process.env.DEV_ADMIN_USERNAME, DEV_ADMIN_PASSWORD: process.env.DEV_ADMIN_PASSWORD };
  process.env.NODE_ENV = "production";
  process.env.DEV_ADMIN_USERNAME = "dev@example.com";
  process.env.DEV_ADMIN_PASSWORD = "test-only-password";
  let revoked = 0;
  const repository = {
    findUserByEmail: async () => null,
    createUser: () => { throw new Error("Unexpected provisioning"); },
    revokeAllRefreshTokensForUser: async () => { revoked++; },
    createRefreshToken: async () => ({}),
  };
  const service = new AuthService({ signAsync: async () => "test-only-token" }, repository);
  try {
    await assert.rejects(() => service.adminLogin({ email: process.env.DEV_ADMIN_USERNAME, password: process.env.DEV_ADMIN_PASSWORD }), /Invalid credentials/);
    const passwordHash = await bcrypt.hash("test-only-password", 4);
    repository.findUserByEmail = async () => ({
      id: "test-admin", email: "admin@example.com", role: "ADMIN", status: "ACTIVE",
      adminUser: { id: "test-profile" }, passwordHash,
    });
    const session = await service.adminLogin({ email: "admin@example.com", password: "test-only-password" });
    assert.equal(session.user.role, "super-admin");
    assert.equal(revoked, 1);
    await assert.rejects(() => service.adminLogin({ email: "admin@example.com", password: "incorrect" }), /Invalid credentials/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("production requires exact HTTPS CORS origins", () => {
  assert.throws(() => config.getCorsOrigins({ NODE_ENV: "production" }));
  for (const origin of ["*", "http://shop.example.com", "https://shop.example.com/path", "https://*.example.com"]) {
    assert.throws(() => config.getCorsOrigins({ NODE_ENV: "production", CORS_ORIGINS: origin }));
  }
  assert.deepEqual(config.getCorsOrigins({ NODE_ENV: "production", CORS_ORIGINS: "https://shop.example.com, https://business.example.com" }),
    ["https://shop.example.com", "https://business.example.com"]);
});

test("development CORS permits all four local apps", () => {
  const origins = config.getCorsOrigins({});
  for (const port of [3000, 3001, 3002, 3003]) assert.ok(origins.includes(`http://localhost:${port}`));
});

test("production disables local uploads by default and validates explicit storage modes", () => {
  assert.equal(config.localUploadsEnabled({ NODE_ENV: "production" }), false);
  assert.equal(config.localUploadsEnabled({}), true);
  assert.equal(config.localUploadsEnabled({ NODE_ENV: "production", UPLOAD_STORAGE: "local" }), true);
  assert.equal(config.localUploadsEnabled({ UPLOAD_STORAGE: "disabled" }), false);
  assert.throws(() => config.localUploadsEnabled({ UPLOAD_STORAGE: "unknown" }), /UPLOAD_STORAGE/);
});

test("production requires explicit strong JWT secret and absolute upload directory", () => {
  assert.throws(() => config.getJwtSecret({ NODE_ENV: "production" }));
  assert.throws(() => config.getJwtSecret({ NODE_ENV: "production", JWT_SECRET: "short" }));
  assert.equal(config.getJwtSecret({ NODE_ENV: "production", JWT_SECRET: "x".repeat(32) }).length, 32);
  assert.throws(() => config.getUploadsDirectory({ NODE_ENV: "production" }));
  assert.throws(() => config.getUploadsDirectory({ NODE_ENV: "production", UPLOAD_DIR: "relative" }));
  const dir = path.resolve("test-persistent-uploads");
  assert.equal(config.getUploadsDirectory({ NODE_ENV: "production", UPLOAD_DIR: dir }), dir);
});

test("payments default off in production and preserve legacy development behavior", () => {
  assert.equal(config.paymentsEnabled({ NODE_ENV: "production" }), false);
  assert.equal(config.paymentsEnabled({}), true);
  assert.equal(config.paymentsEnabled({ PAYMENTS_ENABLED: "false" }), false);
  assert.throws(() => config.paymentsEnabled({ PAYMENTS_ENABLED: "yes" }));
});

test("disabled checkout/payment mutations stop before any database or provider calls", async () => {
  const noCalls = new Proxy({}, { get() { throw new Error("Unexpected DB or payment-provider access"); } });
  const gateway = new PaymentGatewayService({ get: () => "false" }, noCalls, noCalls, noCalls);
  const commerce = new CommerceService(noCalls, gateway);
  assert.throws(() => gateway.createPaymentIntent({}), /disabled/);
  assert.throws(() => gateway.refund({}), /disabled/);
  for (const call of [
    () => commerce.checkout(), () => commerce.createPaymentForOrder("test"),
    () => commerce.markPaymentStatus("test", "PAID"), () => commerce.refundOrder("test"),
    () => commerce.confirmBamoraCharge("test"),
  ]) await assert.rejects(call, /disabled/);
});

test("production schema checks read only and reject missing columns", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let reads = 0;
  const repo = new CommerceRepository({
    $queryRaw: async () => { reads++; return ["image_snapshot", "attention_state", "process_by_at", "delayed_at"].map(column_name => ({ column_name })); },
    $executeRawUnsafe: () => { throw new Error("Must never modify schema"); },
  });
  try {
    await repo.ensureOrderItemImageSnapshotColumn();
    await repo.ensureMerchantSubOrderAttentionStateColumn();
    assert.equal(reads, 2);
    await assert.rejects(() => new CommerceRepository({ $queryRaw: async () => [] }).ensureOrderItemImageSnapshotColumn(), /incompatible/);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test("readiness reports unavailable DB without exposing error details", async () => {
  const ready = new HealthController({ $queryRawUnsafe: async () => [1] });
  assert.deepEqual(await ready.ready(), { status: "ok", service: "bamora-api", database: "connected" });
  const unavailable = new HealthController({ $queryRawUnsafe: async () => { throw new Error("private database details"); } });
  await assert.rejects(() => unavailable.ready(), /Database is unavailable/);
});

test("invalid PORT is rejected", () => {
  for (const port of ["0", "65536", "abc", "1.5"]) assert.throws(() => config.getPort({ PORT: port }));
});

test("HTTP uploads use configured storage, survive app restart and obey exact CORS origins", async () => {
  const fs = require("node:fs/promises");
  const os = require("node:os");
  const { Module } = require("@nestjs/common");
  const { NestFactory, APP_GUARD } = require("@nestjs/core");
  const { JwtModule, JwtService } = require("@nestjs/jwt");
  const { RolesGuard } = require("../dist/common/roles.guard");
  const { AuthRepository } = require("../dist/repositories/auth.repository");
  const { UploadsController } = require("../dist/controllers/uploads.controller");
  const { configureHttpInfrastructure } = require("../dist/common/http-infrastructure");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bamora-upload-test-"));
  const previous = { NODE_ENV: process.env.NODE_ENV, UPLOAD_DIR: process.env.UPLOAD_DIR, CORS_ORIGINS: process.env.CORS_ORIGINS, UPLOAD_STORAGE: process.env.UPLOAD_STORAGE };
  process.env.NODE_ENV = "production";
  process.env.UPLOAD_STORAGE = "local";
  process.env.UPLOAD_DIR = directory;
  process.env.CORS_ORIGINS = "https://shop.example.com";
  class UploadTestModule {}
  Module({
    imports: [JwtModule.register({ secret: "test-only-signing-key" })],
    controllers: [UploadsController],
    providers: [
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: AuthRepository, useValue: {
        findUserById: async () => ({
          id: "test-merchant", email: "merchant@example.com", status: "ACTIVE",
          role: "MERCHANT",
          merchant: { id: "test-profile", status: "ACTIVE" },
        }),
      } },
    ],
  })(UploadTestModule);
  let app;
  async function start() {
    app = await NestFactory.create(UploadTestModule, { logger: false });
    await configureHttpInfrastructure(app);
    await app.listen(0, "127.0.0.1");
    return app.getUrl();
  }
  try {
    let base = await start();
    const unauthorized = await fetch(`${base}/api/uploads/images`, { method: "POST" });
    assert.equal(unauthorized.status, 403);
    const token = app.get(JwtService).sign({ sub: "test-merchant", email: "merchant@example.com", role: "merchant" });
    const form = new FormData();
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2kAAAAASUVORK5CYII=", "base64");
    form.append("file", new Blob([bytes], { type: "image/png" }), "test.png");
    const upload = await fetch(`${base}/api/uploads/images`, {
      method: "POST", body: form, headers: {
        Origin: "https://shop.example.com", Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(upload.status, 201);
    assert.equal(upload.headers.get("access-control-allow-origin"), "https://shop.example.com");
    const image = await upload.json();
    assert.deepEqual(await fs.readFile(path.join(directory, image.filename)), bytes);
    await app.close();
    app = undefined;
    base = await start();
    const restored = await fetch(`${base}${image.url}`);
    assert.equal(restored.status, 200);
    assert.deepEqual(Buffer.from(await restored.arrayBuffer()), bytes);
    const denied = await fetch(`${base}${image.url}`, { headers: { Origin: "https://unrelated.example.com" } });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    await app.close();
    app = undefined;
    delete process.env.UPLOAD_STORAGE;
    delete process.env.UPLOAD_DIR;
    base = await start();
    const disabledToken = app.get(JwtService).sign({ sub: "test-merchant", email: "merchant@example.com", role: "merchant" });
    for (const body of [undefined, form]) {
      const blocked = await fetch(`${base}/api/uploads/images`, {
        method: "POST", body,
        headers: { Authorization: `Bearer ${disabledToken}`, Origin: "https://shop.example.com" },
      });
      assert.equal(blocked.status, 503);
      assert.match((await blocked.json()).message, /File uploads are temporarily unavailable/);
      assert.equal(blocked.headers.get("access-control-allow-origin"), "https://shop.example.com");
    }
    const malformed = await fetch(`${base}/api/uploads/images`, {
      method: "POST", body: "not a valid multipart upload",
      headers: { Authorization: `Bearer ${disabledToken}`, "Content-Type": "multipart/form-data" },
    });
    assert.equal(malformed.status, 503, "guard must reject before Multer parses the request");
    assert.equal((await fetch(`${base}${image.url}`)).status, 404);
    const commerce = new CommerceService({}, {});
    await commerce.removeLocalUploadFiles([image.url]);
    assert.deepEqual(await fs.readFile(path.join(directory, image.filename)), bytes);
    assert.deepEqual(await fs.readdir(directory), [image.filename]);
  } finally {
    if (app) await app.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    // Only remove the test-created temporary directory, never project uploads.
    await fs.rm(directory, { recursive: true, force: true });
  }
});
