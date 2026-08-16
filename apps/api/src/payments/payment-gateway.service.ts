import { Injectable } from "@nestjs/common";
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

  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return this.getProvider().createPaymentIntent(input);
  }

  refund(input: RefundInput): Promise<RefundResult> {
    return this.getProvider().refund(input);
  }

  getProviderName() {
    return this.getProvider().name;
  }
}
