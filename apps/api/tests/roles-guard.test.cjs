require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JwtService } = require("@nestjs/jwt");
const { RolesGuard } = require("../dist/common/roles.guard");

const jwt = new JwtService({ secret: "test-only-role-guard-key" });

async function authorize({ required = ["merchant"], payload, user, headers = {} }) {
  const request = { headers };
  if (payload) request.headers.authorization = `Bearer ${jwt.sign(payload)}`;
  const guard = new RolesGuard(
    { getAllAndOverride: () => required },
    jwt,
    { findUserById: async () => user },
  );
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { allowed: await guard.canActivate(context), request };
}

const merchant = {
  id: "test-merchant", email: "merchant@example.com", role: "MERCHANT", status: "ACTIVE",
  merchant: { id: "test-profile", status: "ACTIVE" },
};
const merchantToken = { sub: merchant.id, email: merchant.email, role: "merchant" };

test("server authorizes active merchant and populates identity from database", async () => {
  const result = await authorize({ payload: merchantToken, user: merchant });
  assert.equal(result.allowed, true);
  assert.equal(result.request.user.merchantId, merchant.merchant.id);
  assert.equal(result.request.user.role, "merchant");
});

test("browser role headers and absent/invalid JWT cannot grant permissions", async () => {
  assert.equal((await authorize({ user: merchant, headers: { "x-role": "merchant", "x-user-id": merchant.id } })).allowed, false);
  assert.equal((await authorize({ user: merchant, headers: { authorization: "Bearer forged" } })).allowed, false);
});

test("server rejects stale role tokens even if an old profile still exists", async () => {
  assert.equal((await authorize({ payload: merchantToken, user: { ...merchant, role: "CUSTOMER" } })).allowed, false);
  const admin = { id: "test-admin", email: "admin@example.com", role: "MERCHANT", status: "ACTIVE", adminUser: { id: "old-admin-profile" } };
  assert.equal((await authorize({
    required: ["super-admin"], payload: { sub: admin.id, email: admin.email, role: "super-admin" }, user: admin,
  })).allowed, false);
});

test("server rejects suspension, pending merchants, identity mismatch and missing profiles", async () => {
  for (const user of [
    null,
    { ...merchant, status: "SUSPENDED" },
    { ...merchant, merchant: { ...merchant.merchant, status: "PENDING" } },
    { ...merchant, email: "different@example.com" },
    { ...merchant, merchant: null },
  ]) {
    assert.equal((await authorize({ payload: merchantToken, user })).allowed, false);
  }
});

test("merchant token cannot authorize admin endpoints", async () => {
  assert.equal((await authorize({ required: ["super-admin"], payload: merchantToken, user: merchant })).allowed, false);
});

test("active database admin is authorized only with admin profile", async () => {
  const admin = { id: "test-admin", email: "admin@example.com", role: "ADMIN", status: "ACTIVE", adminUser: { id: "test-profile" } };
  const payload = { sub: admin.id, email: admin.email, role: "super-admin" };
  assert.equal((await authorize({ required: ["super-admin"], payload, user: admin })).allowed, true);
  assert.equal((await authorize({ required: ["super-admin"], payload, user: { ...admin, adminUser: null } })).allowed, false);
});

test("delivery and unsupported JWT roles cannot inherit administrator permissions", async () => {
  assert.equal((await authorize({
    required: ["super-admin"], payload: { ...merchantToken, role: "delivery" }, user: merchant,
  })).allowed, false);
});
