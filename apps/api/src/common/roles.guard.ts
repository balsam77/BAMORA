import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Array<"customer" | "merchant" | "super-admin">>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { sub: string; email: string; role: "customer" | "merchant" | "super-admin" };
    }>();

    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    if (bearerToken) {
      try {
        const payload = this.jwtService.verify<{ sub: string; email: string; role: "customer" | "merchant" | "super-admin" }>(
          bearerToken,
        );
        request.user = payload;
        return requiredRoles.includes(payload.role);
      } catch {
        return false;
      }
    }

    const roleHeader = request.headers["x-role"];

    if (!roleHeader) {
      return false;
    }

    return requiredRoles.includes(roleHeader as "customer" | "merchant" | "super-admin");
  }
}
