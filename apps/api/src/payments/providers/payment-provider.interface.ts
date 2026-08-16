export type PaymentIntentInput = {
  orderId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
};

export type PaymentIntentResult = {
  provider: string;
  externalId: string;
  status: "PENDING" | "PAID" | "FAILED";
  checkoutUrl?: string;
};

export type RefundInput = {
  paymentExternalId: string;
  amount: number;
  reason?: string;
};

export type RefundResult = {
  provider: string;
  refundExternalId: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
