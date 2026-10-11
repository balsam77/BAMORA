import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function ShippingPolicyPage() {
  return (
    <LegalPageFrame
      activeHref="/shipping-policy"
      title={{ ar: "سياسة الشحن والتوصيل", he: "מדיניות משלוחים", en: "Shipping and delivery policy" }}
      intro={{
        ar: "تصف هذه الصفحة سياسة شحن BAMORA بصيغة مرنة قابلة للتعديل لاحقًا حسب نموذج العمل الفعلي للتجار والمنصة.",
        he: "עמוד זה מתאר את מדיניות המשלוחים של BAMORA בפורמט גמיש הניתן לעדכון לפי מודל הפעילות בפועל של הסוחרים והפלטפורמה.",
        en: "This page describes BAMORA shipping policy in an editable format for future operational adjustments.",
      }}
      sections={[
        {
          heading: { ar: "نطاق الخدمة", he: "אזורי שירות", en: "Service scope" },
          paragraphs: [
            {
              ar: "تختلف مناطق التوصيل حسب التاجر ونوع المنتج. يتم عرض نطاق التغطية المتوقع أثناء إتمام الطلب.",
              he: "אזורי המשלוח משתנים לפי סוחר וסוג מוצר. טווח הכיסוי הצפוי מוצג במהלך השלמת ההזמנה.",
              en: "Delivery zones vary by merchant and product type. Expected coverage is shown during checkout.",
            },
          ],
        },
        {
          heading: { ar: "المدة المتوقعة", he: "זמן אספקה משוער", en: "Estimated delivery time" },
          paragraphs: [
            {
              ar: "مواعيد التسليم تقديرية، وتتأثر بتوفر المنتج، توقيت الطلب، وشركة الشحن أو ضغط المواسم.",
              he: "זמני האספקה הם הערכה ותלויים בזמינות המוצר, זמן ביצוע ההזמנה וספק המשלוחים/עומסי עונה.",
              en: "Delivery windows are estimates affected by stock availability, order time, and carrier/seasonal load.",
            },
          ],
        },
        {
          heading: { ar: "تكلفة الشحن", he: "עלות משלוח", en: "Shipping fees" },
          paragraphs: [
            {
              ar: "قد تختلف رسوم الشحن حسب المدينة وحجم الطلب وسياسة التاجر. يتم إظهار التكلفة النهائية قبل تأكيد الطلب.",
              he: "דמי המשלוח עשויים להשתנות לפי עיר, היקף הזמנה ומדיניות הסוחר. העלות הסופית מוצגת לפני אישור ההזמנה.",
              en: "Shipping fees may vary by city, order size, and merchant policy. Final cost is shown before order confirmation.",
            },
          ],
        },
        {
          heading: { ar: "الاستلام والتتبع", he: "קבלה ומעקב", en: "Receipt and tracking" },
          paragraphs: [
            {
              ar: "بعد الشحن، قد تتوفر معلومات متابعة حسب مزود الخدمة. يرجى مراجعة بيانات الاستلام والتواصل عند وصول الطلب.",
              he: "לאחר השילוח עשוי להופיע מידע מעקב בהתאם לספק השירות. יש לוודא פרטי קבלה ותקשורת בעת המסירה.",
              en: "After dispatch, tracking information may be available depending on the provider. Please verify receipt details at delivery.",
            },
          ],
        },
      ]}
      disclaimer={{
        ar: "هذه السياسة قابلة للتعديل والتحديث لاحقًا وفق آلية عمل BAMORA والتجار.",
        he: "מדיניות זו ניתנת לעדכון בעתיד בהתאם למודל הפעילות של BAMORA והסוחרים.",
        en: "This policy is editable and may be updated based on BAMORA and merchant operations.",
      }}
    />
  );
}
