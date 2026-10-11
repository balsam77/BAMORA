import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";
import { AuthRepository } from "../repositories/auth.repository";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Array<"customer" | "merchant" | "super-admin">>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: {
        sub: string;
        email: string;
        role: "customer" | "merchant" | "super-admin";
        merchantId?: string;
        merchantStatus?: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
      };
    }>();

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    if (!bearerToken) {
      return false;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; role: "customer" | "merchant" | "super-admin" }>(bearerToken);
      const databaseRoles = {
        customer: "CUSTOMER",
        merchant: "MERCHANT",
        "super-admin": "ADMIN",
      } as const;
      if (!Object.prototype.hasOwnProperty.call(databaseRoles, payload.role) ||
          typeof payload.sub !== "string" || typeof payload.email !== "string") {
        return false;
      }
      const user = await this.authRepository.findUserById(payload.sub);
      if (!user || user.email !== payload.email || user.status !== "ACTIVE" ||
          user.role !== databaseRoles[payload.role]) {
        return false;
      }

      if (payload.role === "merchant") {
        if (!user.merchant || user.merchant.status !== "ACTIVE") {
          return false;
        }

        request.user = {
          sub: user.id,
          email: user.email,
          role: payload.role,
          merchantId: user.merchant.id,
          merchantStatus: user.merchant.status,
        };
      } else {
        if (payload.role === "super-admin" && !user.adminUser) {
          return false;
        }

        request.user = {
          sub: user.id,
          email: user.email,
          role: payload.role,
        };
      }

      return requiredRoles.includes(payload.role);
    } catch {
      return false;
    }
  }
}
