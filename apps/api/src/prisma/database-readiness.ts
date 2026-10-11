import { Prisma } from "@prisma/client";

const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

// Identifiers come only from generated Prisma metadata, never from a request.
export const databaseReadinessQuery = `SELECT ${Prisma.dmmf.datamodel.models.map((model, index) => {
  const columns = model.fields
    .filter((field) => field.kind !== "object")
    .map((field) => identifier(field.dbName ?? field.name))
    .join(", ");
  return `(SELECT COUNT(*) FROM (SELECT ${columns} FROM ${identifier(model.dbName ?? model.name)} LIMIT 0) AS checked) AS check_${index}`;
}).join(", ")}`;
