import { Prisma } from "@prisma/client";
import { StartupFailure } from "../common/startup-diagnostics";

export function databaseFailureDetails(error: unknown) {
  let code: string | undefined;
  let sqlState: string | undefined;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    code = error.code;
    const state = error.meta?.code;
    if (typeof state === "string" && /^[0-9A-Z]{5}$/.test(state)) sqlState = state;
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    code = error.errorCode;
  } else {
    return undefined;
  }
  const prismaCode = code && /^P\d{4}$/.test(code) ? code : "UNCLASSIFIED";
  const category =
    prismaCode === "P2021" || sqlState === "42P01" ? "missing-table" :
    prismaCode === "P2022" || sqlState === "42703" ? "missing-column" :
    prismaCode === "P1010" || sqlState === "42501" ? "permission-denied" :
    prismaCode === "P1011" ? "tls-verification-failed" :
    prismaCode === "P1000" ? "authentication-failed" :
    ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(prismaCode) ? "connection-unavailable" :
    "database-query-failed";
  const unavailable = category !== "database-query-failed";
  return { category, prismaCode, sqlState, unavailable };
}

export function databaseFailureMessage(error: unknown) {
  if (error instanceof StartupFailure) {
    return `Database configuration failure: ${JSON.stringify({ stage: error.stage, code: error.safeCode })}`;
  }
  const details = databaseFailureDetails(error);
  return details
    ? `Database failure: ${JSON.stringify(details)}`
    : "Database check failed; unclassified error details withheld.";
}
