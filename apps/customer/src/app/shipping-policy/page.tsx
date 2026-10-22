import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function ShippingPolicyPage() {
  return (
    <LegalPageFrame
      activeHref="/shipping-policy"
      title={{ ar: "سياسة الشحن والتوصيل", he: "מדיניות משלוחים", en: "Shipping and delivery policy" }}
      intro={{
        ar: "التوصيل متاح لكل مدن وبلدات إسرائيل بسعر ثابت 70 ₪ للطلب كاملًا.",
        he: "משלוח זמין לכל הערים והיישובים בישראל במחיר קבוע של 70 ₪ להזמנה כולה.",
        en: "Delivery is available to every city and town in Israel at a fixed rate of ILS 70 for the entire order.",
      }}
      sections={[
        {
          heading: { ar: "نطاق الخدمة", he: "אזורי שירות", en: "Service scope" },
          paragraphs: [
            {
              ar: "نغطي جميع مدن وبلدات إسرائيل دون قائمة مناطق محلية أو اختلاف في السعر حسب المدينة.",
              he: "המשלוח מכסה את כל הערים והיישובים בישראל, ללא רשימת אזורים מקומית וללא שינוי במחיר לפי עיר.",
              en: "We cover all cities and towns in Israel, without a local-zone list or city-based price differences.",
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
              ar: "رسوم التوصيل 70 ₪ مرة واحدة للطلب المدفوع كاملًا، مهما تعددت المنتجات أو الكميات أو التجار، ودون رسوم إضافية لكل طلب فرعي أو شحنة ضمن الطلب نفسه.",
              he: "דמי המשלוח הם 70 ₪ פעם אחת להזמנה המשולמת כולה, ללא תלות במספר המוצרים, הכמויות או הסוחרים, וללא חיוב נוסף לכל הזמנת משנה או משלוח באותה הזמנה.",
              en: "Delivery costs ILS 70 once for the entire paid order, regardless of products, quantities, or merchants, with no additional fee per sub-order or shipment within that order.",
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
