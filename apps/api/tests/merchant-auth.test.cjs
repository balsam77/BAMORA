require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { AuthService } = require("../dist/auth/auth.service");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { MerchantRegistrationDto, MerchantLoginDto } = require("../dist/auth/auth.dto");

const password = "test-only-merchant-password";

test("merchant login requires a stored password, approval and no account provisioning", async () => {
  const user = {
    id: "user-1", email: "merchant@example.invalid", role: "MERCHANT", status: "ACTIVE",
    passwordHash: await bcrypt.hash(password, 4), merchant: { id: "merchant-1", status: "ACTIVE" },
  };
  let revoked = 0;
  const repository = {
    findUserByEmail: async () => user,
    revokeAllRefreshTokensForUser: async () => { revoked++; },
    createRefreshToken: async () => ({}),
  };
  const service = new AuthService({ signAsync: async () => "test-token" }, repository);
  const dto = { email: user.email, password };
  await assert.rejects(() => service.merchantLogin({ ...dto, password: "4567" }), /12 to 64/);
  await assert.rejects(() => service.merchantLogin({ ...dto, password: "wrong-long-password" }), /Invalid credentials/);
  user.merchant.status = "PENDING";
  await assert.rejects(() => service.merchantLogin(dto), /pending admin approval/);
  assert.equal(revoked, 0);
  user.merchant.status = "ACTIVE";
  const session = await service.merchantLogin(dto);
  assert.equal(session.user.role, "merchant");
  assert.equal(revoked, 1);
  repository.findUserByEmail = async () => null;
  await assert.rejects(() => service.merchantLogin(dto), /Invalid credentials/);
});

test("merchant registration hashes the chosen password and remains pending", async () => {
  let saved;
  const service = new AuthService({}, {
    findUserByEmail: async () => null, findUserByNationalIdHash: async () => null,
    createUser: async input => { saved = input; return { merchant: { id: "merchant-1", status: "PENDING" } }; },
  });
  const input = { businessName: "Test store", email: "new@example.invalid", phone: "0501234567", nationalId: "123456789", password };
  const result = await service.registerMerchantApplication(input);
  assert.equal(result.status, "PENDING");
  assert.equal(await bcrypt.compare(password, saved.passwordHash), true);
  assert.equal(await bcrypt.compare("789", saved.passwordHash), false);
  assert.equal(saved.role, "MERCHANT");
  assert.equal(saved.nationalId, undefined);
  assert.equal((await validate(plainToInstance(MerchantRegistrationDto, input))).length, 0);
  assert.ok((await validate(plainToInstance(MerchantRegistrationDto, { ...input, password: undefined }))).length);
  assert.equal((await validate(plainToInstance(MerchantLoginDto, { email: input.email, password }))).length, 0);
});
