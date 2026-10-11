import { Body, Controller, Headers, Ip, Post } from "@nestjs/common";
import {
  AdminLoginDto,
  LoginDto,
  LogoutDto,
  MerchantLoginDto,
  MerchantRegistrationDto,
  RefreshTokenDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  SignupDto,
  VerifyOtpDto,
} from "../auth/auth.dto";
import { AuthService } from "../auth/auth.service";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  signup(
    @Body() payload: SignupDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.signup(payload, userAgent, ipAddress);
  }

  @Post("merchant/register")
  registerMerchant(@Body() payload: MerchantRegistrationDto) {
    return this.authService.registerMerchantApplication(payload);
  }

  @Post("login")
  login(
    @Body() payload: LoginDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.login(payload, userAgent, ipAddress);
  }

  @Post("merchant/login")
  merchantLogin(
    @Body() payload: MerchantLoginDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.merchantLogin(payload, userAgent, ipAddress);
  }

  @Post("admin/login")
  adminLogin(
    @Body() payload: AdminLoginDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.adminLogin(payload, userAgent, ipAddress);
  }

  @Post("refresh")
  refresh(
    @Body() payload: RefreshTokenDto,
    @Headers("user-agent") userAgent?: string,
    @Ip() ipAddress?: string,
  ) {
    return this.authService.refresh(payload, userAgent, ipAddress);
  }

  @Post("logout")
  logout(@Body() payload: LogoutDto) {
    return this.authService.logout(payload);
  }

  @Post("password/request-reset")
  requestPasswordReset(@Body() payload: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(payload);
  }

  @Post("password/verify-otp")
  verifyOtp(@Body() payload: VerifyOtpDto) {
    return this.authService.verifyOtp(payload);
  }

  @Post("password/reset")
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }
}
