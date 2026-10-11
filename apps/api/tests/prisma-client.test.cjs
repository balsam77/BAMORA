const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Prisma } = require("@prisma/client");

test("Prisma Client includes Decimal and every schema model after the build", () => {
  const schema = fs.readFileSync(path.join(__dirname, "..", "prisma", "schema.prisma"), "utf8");
  const models = Array.from(schema.matchAll(/^model\s+(\w+)\s*\{/gm), (match) => match[1]).sort();
  assert.equal(typeof Prisma.Decimal, "function");
  assert.equal(new Prisma.Decimal("0.1").plus("0.2").toString(), "0.3");
  assert.deepEqual(Prisma.dmmf.datamodel.models.map((model) => model.name).sort(), models);
  assert.equal(Prisma.prismaVersion.client, require("@prisma/client/package.json").version);
});

test("API build and standalone typecheck generate Prisma Client before TypeScript", () => {
  const { scripts } = require("../package.json");
  for (const command of [scripts.build, scripts.typecheck]) {
    assert.match(command, /^pnpm db:generate && tsc\b/);
    assert.doesNotMatch(command, /migrate|db:push|seed/);
  }
});
