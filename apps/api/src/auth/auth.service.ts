import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  SignupDto,
  VerifyOtpDto,
} from "./auth.dto";
import { AuthRepository } from "../repositories/auth.repository";

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds = 15 * 60;
  private readonly refreshTokenTtlDays = 30;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
  ) {}

  private hashValue(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private roleToDb(role: "customer" | "merchant" | "super-admin") {
    if (role === "merchant") {
      return "MERCHANT" as const;
    }

    if (role === "super-admin") {
      return "ADMIN" as const;
    }

    return "CUSTOMER" as const;
  }

  private roleFromDb(role: "CUSTOMER" | "MERCHANT" | "ADMIN") {
    if (role === "MERCHANT") {
      return "merchant" as const;
    }

    if (role === "ADMIN") {
      return "super-admin" as const;
    }

    return "customer" as const;
  }

  private async createSessionTokens(user: { id: string; email: string; role: "CUSTOMER" | "MERCHANT" | "ADMIN" }, userAgent?: string, ipAddress?: string) {
    const role = this.roleFromDb(user.role);
    const payload = { sub: user.id, email: user.email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtlSeconds,
    });

    const refreshToken = randomBytes(48).toString("hex");
    const refreshTokenHash = this.hashValue(refreshToken);

    const expiresAt = new Date(Date.now() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    await this.authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.accessTokenTtlSeconds,
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    };
  }

  async signup(dto: SignupDto, userAgent?: string, ipAddress?: string) {
    const existing = await this.authRepository.findUserByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new BadRequestException("Email is already registered.");
    }

    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.authRepository.createUser({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: this.roleToDb(dto.role ?? "customer"),
      firstName,
      lastName,
      businessName: dto.name,
    });

    return this.createSessionTokens(created, userAgent, ipAddress);
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.authRepository.findUserByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const matched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    await this.authRepository.revokeAllRefreshTokensForUser(user.id);
    return this.createSessionTokens(user, userAgent, ipAddress);
  }

  async refresh(dto: RefreshTokenDto, userAgent?: string, ipAddress?: string) {
    const tokenHash = this.hashValue(dto.refreshToken);
    const tokenRecord = await this.authRepository.findRefreshToken(tokenHash);
    if (!tokenRecord || tokenRecord.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token is invalid or expired.");
    }

    const user = await this.authRepository.findUserById(tokenRecord.userId);
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    await this.authRepository.revokeRefreshToken(tokenRecord.id);
    return this.createSessionTokens(user, userAgent, ipAddress);
  }

  async logout(dto: LogoutDto) {
    const tokenHash = this.hashValue(dto.refreshToken);
    const tokenRecord = await this.authRepository.findRefreshToken(tokenHash);
    if (!tokenRecord) {
      return { success: true };
    }

    await this.authRepository.revokeRefreshToken(tokenRecord.id);
    return { success: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.authRepository.findUserByEmail(dto.email.toLowerCase());
    if (!user) {
      return { success: true };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = this.hashValue(otp);

    await this.authRepository.createOtpCode({
      userId: user.id,
      email: user.email,
      codeHash: otpHash,
      purpose: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Replace this with real email provider integration.
    return { success: true, otpPreview: otp };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const record = await this.authRepository.findActiveOtpCode(dto.email.toLowerCase(), "PASSWORD_RESET");
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("OTP expired or invalid.");
    }

    const hashed = this.hashValue(dto.otp);
    if (hashed !== record.codeHash) {
      throw new BadRequestException("OTP expired or invalid.");
    }

    await this.authRepository.markOtpUsed(record.id);

    const resetToken = randomBytes(48).toString("hex");
    await this.authRepository.createPasswordResetToken({
      userId: record.userId,
      tokenHash: this.hashValue(resetToken),
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    });

    return { verified: true, resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashValue(dto.token);
    const record = await this.authRepository.findValidPasswordResetToken(tokenHash);
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Reset token invalid or expired.");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.authRepository.updateUserPassword(record.userId, passwordHash);
    await this.authRepository.markPasswordResetTokenUsed(record.id);
    await this.authRepository.revokeAllRefreshTokensForUser(record.userId);

    return { success: true };
  }
}
