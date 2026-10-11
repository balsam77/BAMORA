import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function ReturnsRefundsPage() {
  return (
    <LegalPageFrame
      activeHref="/returns-refunds"
      title={{ ar: "سياسة الإلغاء والإرجاع والاسترداد", he: "ביטולים והחזרות", en: "Cancellation, returns, and refunds" }}
      intro={{
        ar: "تعد هذه السياسة إطارًا أوليًا مرنًا يمكن تحديثه لاحقًا بحسب سياسة BAMORA النهائية ومتطلبات التجار.",
        he: "מדיניות זו היא מסגרת ראשונית וגמישה שניתנת לעדכון בעתיד לפי מדיניות BAMORA הסופית ודרישות הסוחרים.",
        en: "This policy is an initial flexible framework that can be updated according to BAMORA final rules and merchant requirements.",
      }}
      sections={[
        {
          heading: { ar: "طلبات الإلغاء", he: "בקשות ביטול", en: "Cancellation requests" },
          paragraphs: [
            {
              ar: "يمكن طلب إلغاء الطلب قبل بدء التجهيز الفعلي. بعد الدخول في مرحلة الشحن، قد تطبق شروط مختلفة حسب التاجر.",
              he: "ניתן לבקש ביטול לפני תחילת הכנה בפועל. לאחר מעבר לשלב משלוח, עשויים לחול תנאים שונים לפי הסוחר.",
              en: "Order cancellation may be requested before processing begins. Once shipped, different merchant-specific conditions may apply.",
            },
          ],
        },
        {
          heading: { ar: "الإرجاع والاستبدال", he: "החזרה והחלפה", en: "Returns and exchanges" },
          paragraphs: [
            {
              ar: "يتم قبول الإرجاع أو الاستبدال وفق حالة المنتج والمدة المحددة وسياسة التاجر، مع الالتزام بالمتطلبات النظامية المعمول بها.",
              he: "החזרה או החלפה יתאפשרו לפי מצב המוצר, פרק הזמן המותר ומדיניות הסוחר, בהתאם לדרישות הדין.",
              en: "Returns or exchanges are accepted based on product condition, time window, and merchant policy, subject to legal requirements.",
            },
          ],
        },
        {
          heading: { ar: "آلية الاسترداد", he: "תהליך ההחזר הכספי", en: "Refund process" },
          paragraphs: [
            {
              ar: "بعد الموافقة على الطلب، تتم معالجة الاسترداد بنفس وسيلة الدفع أو وسيلة مكافئة بحسب الأنظمة المتاحة.",
              he: "לאחר אישור הבקשה, ההחזר יתבצע לאמצעי התשלום המקורי או אמצעי מקביל בהתאם למערכות הזמינות.",
              en: "Once approved, refunds are processed to the original payment method or an equivalent channel, depending on available systems.",
            },
          ],
        },
        {
          heading: { ar: "تكاليف الشحن في الإرجاع", he: "עלויות משלוח בהחזרה", en: "Return shipping costs" },
          paragraphs: [
            {
              ar: "قد تختلف مسؤولية رسوم الشحن عند الإرجاع حسب سبب الإرجاع وسياسة التاجر وحالة المنتج.",
              he: "האחריות לדמי משלוח בהחזרה עשויה להשתנות לפי סיבת ההחזרה, מדיניות הסוחר ומצב המוצר.",
              en: "Responsibility for return shipping fees may vary based on return reason, merchant policy, and item condition.",
            },
          ],
        },
      ]}
      disclaimer={{
        ar: "هذه السياسة قابلة للتعديل لاحقًا بما يتوافق مع السياسة النهائية لـ BAMORA.",
        he: "מדיניות זו ניתנת לעדכון בהמשך בהתאם למדיניות הסופית של BAMORA.",
        en: "This policy is subject to later updates in line with BAMORA final policy.",
      }}
    />
  );
}
