import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: "customer" | "merchant" | "super-admin";
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    return request.user ?? null;
  },
);
