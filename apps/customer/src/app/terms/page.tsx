import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function TermsPage() {
  return (
    <LegalPageFrame
      activeHref="/terms"
      title={{ ar: "شروط وأحكام الموقع", he: "תקנון האתר", en: "Website terms and conditions" }}
      intro={{
        ar: "تمثل هذه الصفحة مسودة عامة أولية قابلة للمراجعة القانونية والتحديث، وتوضح مبادئ استخدام منصة BAMORA.",
        he: "עמוד זה הוא טיוטה כללית ראשונית הניתנת לבדיקה משפטית ולעדכון, ומציג את עקרונות השימוש ב-BAMORA.",
        en: "This page is a general draft for legal review and future updates, describing the principles of using BAMORA.",
      }}
      sections={[
        {
          heading: { ar: "1) استخدام الموقع", he: "1) שימוש באתר", en: "1) Use of the website" },
          paragraphs: [
            {
              ar: "باستخدام BAMORA يوافق المستخدم على الالتزام بالقوانين المحلية وهذه الشروط أثناء التصفح والشراء.",
              he: "השימוש ב-BAMORA מהווה הסכמה לעמידה בדין המקומי ובתנאים אלה במהלך גלישה ורכישה.",
              en: "By using BAMORA, users agree to comply with applicable laws and these terms while browsing and purchasing.",
            },
          ],
        },
        {
          heading: { ar: "2) التسجيل والحساب", he: "2) הרשמה וחשבון", en: "2) Registration and account" },
          paragraphs: [
            {
              ar: "المستخدم مسؤول عن صحة بياناته وسرية معلومات الدخول، وأي نشاط يتم من خلال حسابه يُنسب إليه ما لم يُثبت خلاف ذلك.",
              he: "המשתמש אחראי לנכונות פרטיו ולשמירת פרטי הגישה; כל פעילות מחשבונו תיוחס אליו אלא אם הוכח אחרת.",
              en: "Users are responsible for accurate information and safeguarding credentials; account activity is attributed to the account owner unless proven otherwise.",
            },
          ],
        },
        {
          heading: { ar: "3) الطلبات والشراء", he: "3) הזמנות ורכישה", en: "3) Orders and purchasing" },
          paragraphs: [
            {
              ar: "تنفذ الطلبات حسب توفر المنتجات وموافقة التاجر. قد يتم رفض أو إلغاء الطلب في حالات استثنائية مثل عدم التوفر أو خطأ تقني واضح.",
              he: "הזמנות מבוצעות בכפוף לזמינות המוצר ואישור הסוחר. ניתן לדחות או לבטל הזמנה במקרים חריגים כגון חוסר מלאי או תקלה טכנית מובהקת.",
              en: "Orders are fulfilled subject to product availability and merchant confirmation. Orders may be rejected or canceled in exceptional situations such as stock unavailability or clear technical errors.",
            },
          ],
        },
        {
          heading: { ar: "4) الأسعار والدفع", he: "4) מחירים ותשלום", en: "4) Pricing and payment" },
          paragraphs: [
            {
              ar: "الأسعار المعروضة قد تتغير وفق سياسة كل تاجر. يتحمل المستخدم مسؤولية مراجعة السعر النهائي ورسوم الشحن قبل تأكيد الطلب.",
              he: "המחירים עשויים להשתנות לפי מדיניות כל סוחר. המשתמש אחראי לבדוק את המחיר הסופי ודמי המשלוח לפני אישור ההזמנה.",
              en: "Displayed prices may change according to each merchant policy. Users are responsible for reviewing final price and shipping fees before confirming an order.",
            },
          ],
        },
        {
          heading: { ar: "5) مسؤولية المنتجات", he: "5) אחריות למוצרים", en: "5) Product responsibility" },
          paragraphs: [
            {
              ar: "مواصفات المنتج وصوره ومحتواه مسؤولية التاجر صاحب العرض، مع التزام BAMORA باتخاذ إجراءات معقولة لمعالجة البلاغات.",
              he: "מפרט המוצר, התמונות והתוכן באחריות הסוחר המפרסם, כאשר BAMORA פועלת באופן סביר לטיפול בדיווחים.",
              en: "Product specifications, images, and listings are the merchant's responsibility, while BAMORA undertakes reasonable measures to handle reports.",
            },
          ],
        },
        {
          heading: { ar: "6) التجار الموجودين على BAMORA", he: "6) סוחרים ב-BAMORA", en: "6) Merchants on BAMORA" },
          paragraphs: [
            {
              ar: "يُطلب من التجار الالتزام بالمعايير المهنية وجودة الخدمة وتوفير معلومات دقيقة عن المنتجات وسياساتهم.",
              he: "סוחרים נדרשים לעמוד בסטנדרטים מקצועיים, איכות שירות ומסירת מידע מדויק על מוצרים ומדיניותם.",
              en: "Merchants are expected to maintain professional standards, service quality, and accurate product and policy information.",
            },
          ],
        },
        {
          heading: { ar: "7) الشحن والتوصيل", he: "7) משלוח ואספקה", en: "7) Shipping and delivery" },
          paragraphs: [
            {
              ar: "أوقات التوصيل تقديرية وتعتمد على التاجر وشركة الشحن والمنطقة الجغرافية. قد تحدث تأخيرات خارجة عن الإرادة.",
              he: "זמני האספקה משוערים ותלויים בסוחר, בחברת המשלוחים ובאזור הגאוגרפי. ייתכנו עיכובים שאינם בשליטת הצדדים.",
              en: "Delivery times are estimates and depend on merchant, carrier, and destination area. Delays may occur due to circumstances beyond control.",
            },
          ],
        },
        {
          heading: { ar: "8) الإلغاء والإرجاع والاستبدال", he: "8) ביטול, החזרה והחלפה", en: "8) Cancellation, returns, and exchanges" },
          paragraphs: [
            {
              ar: "تخضع الطلبات لسياسات الإلغاء والإرجاع الخاصة بالتاجر وبما يتوافق مع سياسة BAMORA المعلنة والتشريعات المعمول بها.",
              he: "הזמנות כפופות למדיניות ביטול והחזרה של הסוחר, בכפוף למדיניות BAMORA ולהוראות הדין החל.",
              en: "Orders are subject to merchant cancellation/return policies, aligned with BAMORA policy and applicable regulations.",
            },
          ],
        },
        {
          heading: { ar: "9) مسؤولية BAMORA", he: "9) אחריות BAMORA", en: "9) BAMORA liability" },
          paragraphs: [
            {
              ar: "تعمل BAMORA كمنصة وسيطة بين العميل والتاجر، ولا تتحمل المسؤولية عن أي أضرار غير مباشرة إلا ضمن ما يفرضه القانون.",
              he: "BAMORA פועלת כפלטפורמת תיווך בין לקוח לסוחר, ואינה אחראית לנזקים עקיפים מעבר לנדרש בדין.",
              en: "BAMORA operates as an intermediary marketplace and is not liable for indirect damages except as required by law.",
            },
          ],
        },
        {
          heading: { ar: "10) حقوق الملكية الفكرية", he: "10) קניין רוחני", en: "10) Intellectual property" },
          paragraphs: [
            {
              ar: "العلامات التجارية والتصاميم والمحتوى المملوك للمنصة أو لأصحابه محمي، ولا يجوز نسخه أو استغلاله دون إذن.",
              he: "סימני מסחר, עיצובים ותוכן של הפלטפורמה או בעליהם מוגנים, ואין להעתיקם או להשתמש בהם ללא אישור.",
              en: "Trademarks, designs, and content owned by the platform or their owners are protected and may not be copied or used without permission.",
            },
          ],
        },
        {
          heading: { ar: "11) الخصوصية", he: "11) פרטיות", en: "11) Privacy" },
          paragraphs: [
            {
              ar: "يتم التعامل مع البيانات الشخصية وفق سياسة الخصوصية الخاصة بـ BAMORA، ويعد استمرار الاستخدام موافقة على تلك السياسة.",
              he: "הנתונים האישיים מטופלים בהתאם למדיניות הפרטיות של BAMORA, והמשך שימוש מהווה הסכמה למדיניות זו.",
              en: "Personal data is handled according to BAMORA privacy policy, and continued use constitutes acceptance of that policy.",
            },
          ],
        },
        {
          heading: { ar: "12) إنهاء الحساب", he: "12) סיום חשבון", en: "12) Account termination" },
          paragraphs: [
            {
              ar: "يجوز تعليق أو إنهاء الحساب عند مخالفة الشروط أو عند وجود مخاطر أمنية أو تشغيلية تستدعي ذلك.",
              he: "ניתן להשעות או לסיים חשבון במקרה של הפרת תנאים או קיום סיכוני אבטחה/תפעול המצדיקים זאת.",
              en: "Accounts may be suspended or terminated for terms violations or security/operational risks that justify such action.",
            },
          ],
        },
        {
          heading: { ar: "13) التواصل مع BAMORA", he: "13) יצירת קשר עם BAMORA", en: "13) Contacting BAMORA" },
          paragraphs: [
            {
              ar: "للاستفسارات أو الشكاوى، يمكن التواصل عبر صفحة צור קשר. قد يتم تحديث هذه الشروط ونشر النسخة المحدثة على الموقع.",
              he: "לפניות או תלונות ניתן ליצור קשר דרך עמוד צור קשר. תנאים אלה עשויים להתעדכן והגרסה המעודכנת תפורסם באתר.",
              en: "For inquiries or complaints, please use the Contact page. These terms may be updated and the latest version will be published on the site.",
            },
          ],
        },
      ]}
      disclaimer={{
        ar: "هذه الوثيقة مسودة عامة قابلة للمراجعة القانونية، ولا تشكل استشارة قانونية.",
        he: "מסמך זה הוא טיוטה כללית לבדיקה משפטית ואינו מהווה ייעוץ משפטי.",
        en: "This document is a general draft for legal review and does not constitute legal advice.",
      }}
    />
  );
}
