import { Injectable } from "@nestjs/common";
import {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from "./payment-provider.interface";

@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      externalId: `manual-intent-${input.orderId}-${Date.now()}`,
      status: "PENDING",
      checkoutUrl: `/payments/manual/${input.orderId}`,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      provider: this.name,
      refundExternalId: `manual-refund-${input.paymentExternalId}-${Date.now()}`,
      status: "COMPLETED",
    };
  }
}
