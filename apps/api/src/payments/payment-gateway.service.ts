import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentIntentInput,
  PaymentIntentResult,
  RefundInput,
  RefundResult,
} from "./providers/payment-provider.interface";
import { ManualPaymentProvider } from "./providers/manual-payment.provider";
import { PaypalPaymentProvider } from "./providers/paypal-payment.provider";
import { StripePaymentProvider } from "./providers/stripe-payment.provider";
import { paymentsEnabled } from "../common/deployment-config";

@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly configService: ConfigService,
    private readonly manualProvider: ManualPaymentProvider,
    private readonly paypalProvider: PaypalPaymentProvider,
    private readonly stripeProvider: StripePaymentProvider,
  ) {}

  private getProvider() {
    const configured = (this.configService.get<string>("PAYMENT_PROVIDER") ?? "manual").toLowerCase();

    if (configured === "paypal") {
      return this.paypalProvider;
    }

    if (configured === "stripe") {
      return this.stripeProvider;
    }

    return this.manualProvider;
  }

  isEnabled() {
    return paymentsEnabled({
      NODE_ENV: process.env.NODE_ENV,
      PAYMENTS_ENABLED: this.configService.get<string>("PAYMENTS_ENABLED"),
    });
  }

  assertEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException("Payments and checkout are disabled pending payment-provider approval.");
    }
  }

  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    this.assertEnabled();
    return this.getProvider().createPaymentIntent(input);
  }

  refund(input: RefundInput): Promise<RefundResult> {
    this.assertEnabled();
    return this.getProvider().refund(input);
  }

  getProviderName() {
    return this.getProvider().name;
  }
}
