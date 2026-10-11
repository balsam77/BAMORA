import type { AppLanguage } from "./language";

export const customerPaymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "1";

export function paymentUnavailableMessage(language: AppLanguage) {
  if (language === "he") {
    return "התשלום והשלמת ההזמנה אינם פעילים עד לקבלת אישור מספק התשלום.";
  }
  if (language === "en") {
    return "Payments and order confirmation are disabled pending payment-provider approval.";
  }
  return "الدفع وتأكيد الطلب غير مفعّلين حتى موافقة مزود الدفع.";
}
