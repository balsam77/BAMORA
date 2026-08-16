import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Array<"customer" | "merchant" | "super-admin">) => SetMetadata(ROLES_KEY, roles);
