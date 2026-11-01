import { Prisma } from "@prisma/client";

const requiredModels = Prisma.dmmf.datamodel.models.map(model => ({
  table: model.dbName ?? model.name,
  columns: model.fields.filter(field => field.kind !== "object").map(field => field.dbName ?? field.name),
}));
const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;

// Inspect catalog metadata and effective read privileges, never application rows.
export const databaseInspectionQuery = `
SELECT n.nspname AS schema_name, c.relname AS table_name,
       a.attname AS column_name,
       has_schema_privilege(n.oid, 'USAGE') AS schema_readable,
       has_column_privilege(c.oid, a.attnum, 'SELECT') AS column_readable
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND a.attnum > 0 AND NOT a.attisdropped
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND c.relname IN (${requiredModels.map(model => literal(model.table)).join(", ")})
ORDER BY n.nspname, c.relname, a.attnum`;

interface InspectedColumn {
  schema_name: string;
  table_name: string;
  column_name: string;
  schema_readable: boolean;
  column_readable: boolean;
}

export async function inspectDatabase(
  prisma: Pick<Prisma.TransactionClient, "$queryRawUnsafe">,
  expectedSchema: string,
) {
  const rows = await prisma.$queryRawUnsafe<InspectedColumn[]>(databaseInspectionQuery);
  const tables = requiredModels.map(model => {
    const columns = rows.filter(row => row.schema_name === expectedSchema && row.table_name === model.table);
    const missingColumns = model.columns.filter(column => !columns.some(row => row.column_name === column));
    const unreadableColumns = columns.filter(row => model.columns.includes(row.column_name) &&
      (!row.schema_readable || !row.column_readable)).map(row => row.column_name);
    return {
      table: model.table,
      exists: columns.length > 0,
      missingColumns,
      unreadableColumns,
      otherSchemas: [...new Set(rows.filter(row => row.table_name === model.table &&
        row.schema_name !== expectedSchema).map(row => row.schema_name))],
    };
  });
  return {
    expectedSchema,
    metadataQuerySucceeded: true,
    ready: tables.every(table => table.exists && !table.missingColumns.length && !table.unreadableColumns.length),
    tables,
  };
}
