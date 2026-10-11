import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly authUserInclude = {
    merchant: true,
    adminUser: true,
  } as const;

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: this.authUserInclude });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: this.authUserInclude });
  }

  findUserByNationalIdHash(nationalIdHash: string) {
    return this.prisma.user.findUnique({ where: { nationalIdHash }, include: this.authUserInclude });
  }

  activateMerchantByUserId(userId: string) {
    return this.prisma.merchant.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
      },
    });
  }

  createUser(input: {
    email: string;
    passwordHash: string;
    role: "CUSTOMER" | "MERCHANT" | "ADMIN";
    firstName?: string;
    lastName?: string;
    businessName?: string;
    phone?: string;
    nationalIdHash?: string;
    nationalIdLast3?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash ?? null,
        nationalIdHash: input.nationalIdHash,
        nationalIdLast3: input.nationalIdLast3,
        role: input.role,
        customer:
          input.role === "CUSTOMER"
            ? {
                create: {
                  firstName: input.firstName ?? null,
                  lastName: input.lastName ?? null,
                },
              }
            : undefined,
        merchant:
          input.role === "MERCHANT"
            ? {
                create: {
                  businessName: input.businessName ?? "BAMORA Merchant",
                },
              }
            : undefined,
        adminUser:
          input.role === "ADMIN"
            ? {
                create: {
                  adminRole: "SUPER_ADMIN",
                },
              }
            : undefined,
      },
      include: this.authUserInclude,
    });
  }

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      },
    });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
      },
    });
  }

  revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  revokeAllRefreshTokensForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  createOtpCode(data: { userId: string; email: string; codeHash: string; purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET"; expiresAt: Date }) {
    return this.prisma.otpCode.create({
      data: {
        userId: data.userId,
        email: data.email,
        codeHash: data.codeHash,
        purpose: data.purpose,
        expiresAt: data.expiresAt,
      },
    });
  }

  findActiveOtpCode(email: string, purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
    return this.prisma.otpCode.findFirst({
      where: {
        email,
        purpose,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  markOtpUsed(id: string) {
    return this.prisma.otpCode.update({ where: { id }, data: { usedAt: new Date() } });
  }

  createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  findValidPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
      },
    });
  }

  markPasswordResetTokenUsed(id: string) {
    return this.prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  updateMerchantStatus(
    merchantId: string,
    data: { status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED"; approvedAt: Date | null },
  ) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: data.status,
        approvedAt: data.approvedAt,
      },
      include: {
        user: true,
      },
    });
  }
}
