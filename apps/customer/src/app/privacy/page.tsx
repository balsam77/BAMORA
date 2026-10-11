import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function PrivacyPage() {
  return (
    <LegalPageFrame
      activeHref="/privacy"
      title={{ ar: "سياسة الخصوصية", he: "מדיניות פרטיות", en: "Privacy policy" }}
      intro={{
        ar: "توضح هذه السياسة كيفية جمع بيانات المستخدمين ومعالجتها وحفظها ضمن BAMORA مع الالتزام بمبادئ الأمان والشفافية.",
        he: "מדיניות זו מסבירה כיצד נתוני משתמשים נאספים, מעובדים ונשמרים ב-BAMORA תוך שמירה על עקרונות אבטחה ושקיפות.",
        en: "This policy explains how user data is collected, used, and stored in BAMORA while following security and transparency principles.",
      }}
      sections={[
        {
          heading: { ar: "البيانات التي نجمعها", he: "אילו נתונים אנו אוספים", en: "Data we collect" },
          paragraphs: [
            {
              ar: "قد تشمل البيانات: معلومات الحساب، بيانات الطلبات، وسجلات التواصل عبر النماذج أو قنوات الدعم.",
              he: "הנתונים עשויים לכלול: פרטי חשבון, נתוני הזמנות ורשומות תקשורת דרך טפסים או ערוצי תמיכה.",
              en: "Data may include account details, order data, and communication records through forms or support channels.",
            },
          ],
        },
        {
          heading: { ar: "استخدام البيانات", he: "שימוש בנתונים", en: "How we use data" },
          paragraphs: [
            {
              ar: "نستخدم البيانات لتشغيل المنصة، معالجة الطلبات، تحسين التجربة، والرد على الاستفسارات الفنية أو الخدمية.",
              he: "הנתונים משמשים להפעלת הפלטפורמה, טיפול בהזמנות, שיפור החוויה ומענה לפניות שירות/תמיכה.",
              en: "Data is used to operate the platform, process orders, improve experience, and respond to support requests.",
            },
          ],
        },
        {
          heading: { ar: "حفظ البيانات", he: "שמירת נתונים", en: "Data retention" },
          paragraphs: [
            {
              ar: "تُحفظ البيانات لمدة لازمة لتحقيق أغراض التشغيل والالتزامات التنظيمية، ثم تُحدّث أو تُزال وفق السياسات المعتمدة.",
              he: "הנתונים נשמרים למשך הזמן הנדרש לצורכי תפעול ועמידה בדרישות רגולטוריות, ולאחר מכן מתעדכנים או נמחקים בהתאם למדיניות.",
              en: "Data is retained as needed for operations and compliance, then updated or deleted according to internal policy.",
            },
          ],
        },
        {
          heading: { ar: "بيانات الطلبات والتواصل", he: "נתוני הזמנות ותקשורת", en: "Order and communication data" },
          paragraphs: [
            {
              ar: "يتم استخدام بيانات الطلبات والمتابعة لضمان إتمام الشحن والخدمة، بينما تُستخدم رسائل التواصل لمعالجة الطلبات والاستفسارات.",
              he: "נתוני הזמנה ומעקב משמשים להבטחת אספקה ושירות, והודעות קשר משמשות לטיפול בבקשות ובפניות.",
              en: "Order and tracking data supports fulfillment and service quality, while messages are used to handle user requests and inquiries.",
            },
          ],
        },
        {
          heading: { ar: "الكوكيز وتقنيات مشابهة", he: "עוגיות וטכנולוגיות דומות", en: "Cookies and similar technologies" },
          paragraphs: [
            {
              ar: "قد تستخدم BAMORA ملفات تعريف الارتباط لتحسين الأداء وتذكر التفضيلات وقياس الاستعمال بطريقة عامة.",
              he: "BAMORA עשויה להשתמש בקובצי Cookie לשיפור ביצועים, זכירת העדפות ומדידת שימוש באופן כללי.",
              en: "BAMORA may use cookies to improve performance, remember preferences, and measure usage trends.",
            },
          ],
        },
        {
          heading: { ar: "مشاركة البيانات مع مزودي الخدمات", he: "שיתוף עם ספקי שירות", en: "Data sharing with service providers" },
          paragraphs: [
            {
              ar: "قد تتم مشاركة الحد الأدنى اللازم من البيانات مع مزودي الدفع، الشحن، أو البنية التقنية لتقديم الخدمة بشكل آمن وفعال.",
              he: "ייתכן שיתוף מינימלי נדרש של נתונים עם ספקי תשלום, משלוח או תשתית טכנית לצורך מתן השירות באופן בטוח ויעיל.",
              en: "Minimum required data may be shared with payment, shipping, or infrastructure providers to deliver services securely and efficiently.",
            },
          ],
        },
        {
          heading: { ar: "أمن المعلومات", he: "אבטחת מידע", en: "Information security" },
          paragraphs: [
            {
              ar: "نتخذ إجراءات تقنية وتنظيمية معقولة لحماية البيانات من الوصول غير المصرح به أو الفقدان أو التعديل غير المشروع.",
              he: "ננקטים אמצעים טכניים וארגוניים סבירים להגנה על מידע מפני גישה לא מורשית, אובדן או שינוי בלתי חוקי.",
              en: "We apply reasonable technical and organizational safeguards against unauthorized access, loss, or unlawful modification of data.",
            },
          ],
        },
      ]}
    />
  );
}
