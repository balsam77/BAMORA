import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

type Role = "customer" | "merchant" | "super-admin";

export class SignupDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  @IsOptional()
  @IsIn(["customer", "merchant", "super-admin"])
  role?: Role;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @Length(6, 128)
  newPassword!: string;
}
