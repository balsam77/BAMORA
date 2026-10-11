import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth/auth.service";
import { AdminController } from "./controllers/admin.controller";
import { AuthController } from "./controllers/auth.controller";
import { CatalogController } from "./controllers/catalog.controller";
import { CustomerController } from "./controllers/customer.controller";
import { HealthController } from "./controllers/health.controller";
import { IntegrationsController } from "./controllers/integrations.controller";
import { MerchantController } from "./controllers/merchant.controller";
import { UploadsController } from "./controllers/uploads.controller";
import { RolesGuard } from "./common/roles.guard";
import { PaymentGatewayService } from "./payments/payment-gateway.service";
import { ManualPaymentProvider } from "./payments/providers/manual-payment.provider";
import { PaypalPaymentProvider } from "./payments/providers/paypal-payment.provider";
import { StripePaymentProvider } from "./payments/providers/stripe-payment.provider";
import { PrismaService } from "./prisma/prisma.service";
import { AuthRepository } from "./repositories/auth.repository";
import { CommerceRepository } from "./repositories/commerce.repository";
import { CommerceService } from "./services/commerce.service";
import { getJwtSecret } from "./common/deployment-config";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret({
          NODE_ENV: process.env.NODE_ENV,
          JWT_SECRET: configService.get<string>("JWT_SECRET"),
        }),
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    CatalogController,
    AdminController,
    MerchantController,
    CustomerController,
    UploadsController,
    IntegrationsController,
  ],
  providers: [
    PrismaService,
    AuthRepository,
    AuthService,
    CommerceRepository,
    CommerceService,
    PaymentGatewayService,
    ManualPaymentProvider,
    PaypalPaymentProvider,
    StripePaymentProvider,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
