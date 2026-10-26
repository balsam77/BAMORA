import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

type Role = "customer" | "merchant" | "super-admin";

export class SignupDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 32)
  phone!: string;
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

export class MerchantRegistrationDto {
  @IsString()
  @Length(12, 64)
  password!: string;

  @IsString()
  @Length(2, 120)
  businessName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(7, 32)
  phone!: string;

  @IsString()
  @Matches(/^\d{6,20}$/)
  nationalId!: string;
}

export class MerchantLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(12, 64)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(7, 32)
  loginCode?: string;
}

export class AdminLoginDto {
  @IsString()
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
