import { Injectable } from "@nestjs/common";
import {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "./payment-provider.interface";

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      externalId: `stripe-pi-${input.orderId}-${Date.now()}`,
      status: "PENDING",
      checkoutUrl: `https://checkout.stripe.com/pay/${input.orderId}`,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      provider: this.name,
      refundExternalId: `stripe-rf-${input.paymentExternalId}-${Date.now()}`,
      status: "PENDING",
    };
  }
}
