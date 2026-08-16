import { Injectable } from "@nestjs/common";
import {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "./payment-provider.interface";

@Injectable()
export class PaypalPaymentProvider implements PaymentProvider {
  readonly name = "paypal";

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      externalId: `paypal-intent-${input.orderId}-${Date.now()}`,
      status: "PENDING",
      checkoutUrl: `https://www.paypal.com/checkoutnow?token=${input.orderId}`,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      provider: this.name,
      refundExternalId: `paypal-refund-${input.paymentExternalId}-${Date.now()}`,
      status: "PENDING",
    };
  }
}
