export type AppLanguage = "ar" | "en" | "he";

export const LANGUAGE_STORAGE_KEY = "bamoraLanguage";

export const languageNames: Record<AppLanguage, string> = {
  ar: "العربية",
  en: "English",
  he: "עברית",
};

const rtlLanguages = new Set<AppLanguage>(["ar", "he"]);

const dictionary: Record<string, { en: string; he: string }> = {
  "اللغة": { en: "Language", he: "שפה" },
  "اختر نوع الحساب للدخول إلى منصة BAMORA": { en: "Choose account type to enter BAMORA", he: "בחר סוג חשבון כדי להיכנס ל-BAMORA" },
  "الدخول إلى تجربة العميل": { en: "Enter customer experience", he: "כניסה לחוויית הלקוח" },
  "إدارة المتجر والطلبات": { en: "Manage store and orders", he: "ניהול החנות וההזמנות" },
  "إدارة المنصة بالكامل": { en: "Manage full platform", he: "ניהול מלא של הפלטפורמה" },
  "اضغط للمتابعة إلى BAMORA": { en: "Tap to continue to BAMORA", he: "לחץ כדי להמשיך ל-BAMORA" },
  "التالي": { en: "Next", he: "הבא" },
  "تخطي": { en: "Skip", he: "דלג" },
  "إنشاء حساب": { en: "Create Account", he: "יצירת חשבון" },
  "ابدأ تجربة تسوق أسهل مع": { en: "Start an easier shopping experience with", he: "התחל חוויית קנייה קלה יותר עם" },
  "الطول": { en: "Height", he: "גובה" },
  "اختر طولك": { en: "Select your height", he: "בחר את הגובה שלך" },
  "المقاس": { en: "Size", he: "מידה" },
  "اختر مقاسك": { en: "Select your size", he: "בחר את המידה שלך" },
  "لون البشرة": { en: "Skin tone", he: "גוון עור" },
  "اختر لون بشرتك": { en: "Select skin tone", he: "בחר גוון עור" },
  "لون العيون": { en: "Eye color", he: "צבע עיניים" },
  "اختر لون عينيك": { en: "Select eye color", he: "בחר צבע עיניים" },
  "صور الملف الشخصي": { en: "Profile photos", he: "תמונות פרופיל" },
  "صورة وجهك": { en: "Face photo", he: "תמונת פנים" },
  "صورة جسمك": { en: "Body photo", he: "תמונת גוף" },
  "متابعة بدون حفظ": { en: "Continue without saving", he: "המשך בלי לשמור" },
  "متابعة وحفظ المعلومات": { en: "Continue and save info", he: "המשך ושמור מידע" },
  "تجربة الملابس": { en: "Try outfits", he: "נסה לבוש" },
  "كيف بقدر أساعدك اليوم؟": { en: "How can I help you today?", he: "איך אפשר לעזור לך היום?" },
  "ابحث عن استفسارك": { en: "Search your inquiry", he: "חפש את השאלה שלך" },
  "أي استفسار؟ تواصل مع فريق": { en: "Any inquiry? Contact", he: "יש שאלה? צור קשר עם" },
  "اسحب لرؤية التجربة": { en: "Swipe to preview", he: "החלק כדי לצפות" },
  "العودة للقسم": { en: "Back to section", he: "חזרה לקטגוריה" },
  "اكمل الدفع": { en: "Continue to payment", he: "המשך לתשלום" },
  "قسم": { en: "Section", he: "קטגוריה" },
  "الدفع": { en: "Checkout", he: "תשלום" },
  "العودة للاختيار": { en: "Back to selection", he: "חזרה לבחירה" },
  "عرض المرايا": { en: "Mirror view", he: "תצוגת מראה" },
  "السلة": { en: "Cart", he: "עגלה" },
  "ملخص الطلب": { en: "Order summary", he: "סיכום הזמנה" },
  "المقاس: M • اللون: أسود": { en: "Size: M • Color: Black", he: "מידה: M • צבע: שחור" },
  "اختر طريقة الدفع": { en: "Choose payment method", he: "בחר אמצעי תשלום" },
  "الإجمالي:": { en: "Total:", he: "סה" },
  "العودة للتعديل": { en: "Back to edit", he: "חזרה לעריכה" },
  "تمت بنجاح": { en: "Completed", he: "בוצע בהצלחה" },
  "تم تأكيد الطلب": { en: "Order confirmed", he: "ההזמנה אושרה" },
  "شكراً لاختيارك": { en: "Thank you for choosing", he: "תודה שבחרת" },
  "تم تأكيد طلبك وسيتم تحضيره الآن للشحن.": { en: "Your order is confirmed and now being prepared for shipping.", he: "ההזמנה אושרה וכעת בהכנה למשלוח." },
  "رقم الطلب": { en: "Order number", he: "מספר הזמנה" },
  "المبلغ المدفوع": { en: "Paid amount", he: "סכום ששולם" },
  "تفاصيل الطلب": { en: "Order details", he: "פרטי הזמנה" },
  "العودة إلى": { en: "Back to", he: "חזרה אל" },
  "اكمال التسوق": { en: "Continue shopping", he: "המשך קנייה" },
  "مرحبًا بك مجددًا": { en: "Welcome back", he: "ברוך שובך" },
  "ابدأ التسوق": { en: "Start shopping", he: "התחל קנייה" },
  "عرض الكل": { en: "View all", he: "צפה בהכול" },
  "الرئيسية": { en: "Home", he: "בית" },
  "تسوق": { en: "Shop", he: "קנייה" },
  "المفضلة": { en: "Favorites", he: "מועדפים" },
  "العروض": { en: "Offers", he: "מבצעים" },
  "مساعدة": { en: "Help", he: "עזרה" },
  "حسابي": { en: "My account", he: "החשבון שלי" },
  "بوابة العميل": { en: "Customer gateway", he: "שער לקוח" },
  "تسجيل الدخول": { en: "Sign in", he: "התחברות" },
  "إنشاء حساب جديد": { en: "Create new account", he: "יצירת חשבון חדש" },
  "أكمل بياناتك للوصول إلى المفضلة، السلة، الطلبات، والدفع.": { en: "Complete your details to access favorites, cart, orders, and checkout.", he: "השלם את פרטיך כדי לגשת למועדפים, עגלה, הזמנות ותשלום." },
  "البريد الإلكتروني": { en: "Email", he: "אימייל" },
  "كلمة المرور": { en: "Password", he: "סיסמה" },
  "الاسم الكامل": { en: "Full name", he: "שם מלא" },
  "جاري المعالجة...": { en: "Processing...", he: "מעבד..." },
  "ليس لديك حساب؟ إنشاء حساب": { en: "No account? Create one", he: "אין חשבון? צור אחד" },
  "لديك حساب بالفعل؟ تسجيل الدخول": { en: "Have an account? Sign in", he: "יש חשבון? התחבר" },
  "صلاحية غير متاحة": { en: "Access denied", he: "אין הרשאה" },
  "هذه الواجهة مخصصة للعميل فقط": { en: "This interface is for customers only", he: "ממשק זה מיועד ללקוחות בלבד" },
  "تبديل الحساب": { en: "Switch account", he: "החלף חשבון" },
  "فتح المرآة": { en: "Open mirror", he: "פתח מראה" },
  "إغلاق المرآة": { en: "Close mirror", he: "סגור מראה" },
  "تسجيل الخروج": { en: "Sign out", he: "התנתקות" },
  "تسجيل الخروج الآن": { en: "Sign out now", he: "התנתק עכשיו" },
  "إلغاء": { en: "Cancel", he: "ביטול" },
  "لا يوجد عنوان افتراضي": { en: "No default address", he: "אין כתובת ברירת מחדל" },
  "بدون عنوان": { en: "No address", he: "אין כתובת" },
};

const reverseDictionary: Record<string, string> = Object.entries(dictionary).reduce<Record<string, string>>((acc, [ar, translated]) => {
  acc[translated.en] = ar;
  acc[translated.he] = ar;
  return acc;
}, {});

const textOrigins = new WeakMap<Text, string>();
const attrOrigins = new WeakMap<Element, Record<string, string>>();

export function getSavedLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "ar";
  }

  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (value === "ar" || value === "en" || value === "he") {
    return value;
  }

  return "ar";
}

export function persistLanguage(language: AppLanguage) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

function translate(source: string, language: AppLanguage) {
  const trimmed = source.trim();
  const index = source.indexOf(trimmed);
  const spacingPrefix = index >= 0 ? source.slice(0, index) : "";
  const spacingSuffix = index >= 0 ? source.slice(index + trimmed.length) : "";

  if (language === "ar") {
    if (reverseDictionary[trimmed]) {
      return `${spacingPrefix}${reverseDictionary[trimmed]}${spacingSuffix}`;
    }

    if (trimmed.startsWith("Language: ")) {
      const value = trimmed.slice("Language: ".length);
      return `${spacingPrefix}اللغة: ${value}${spacingSuffix}`;
    }

    if (trimmed.startsWith("שפה: ")) {
      const value = trimmed.slice("שפה: ".length);
      return `${spacingPrefix}اللغة: ${value}${spacingSuffix}`;
    }

    return source;
  }

  if (dictionary[trimmed]) {
    return `${spacingPrefix}${dictionary[trimmed][language]}${spacingSuffix}`;
  }

  if (trimmed.startsWith("قسم ")) {
    const value = trimmed.slice(4);
    const label = language === "en" ? "Section" : "קטגוריה";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (trimmed.startsWith("اللغة: ")) {
    const value = trimmed.slice("اللغة: ".length);
    const label = language === "en" ? "Language:" : "שפה:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (trimmed.startsWith("الدور الحالي: ")) {
    const value = trimmed.slice("الدور الحالي: ".length);
    const label = language === "en" ? "Current role:" : "תפקיד נוכחי:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (trimmed.startsWith("العودة إلى ")) {
    const value = trimmed.slice("العودة إلى ".length);
    const label = language === "en" ? "Back to" : "חזרה אל";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  return source;
}

export function applyRuntimeTranslations(root: HTMLElement, language: AppLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.nodeValue || !node.nodeValue.trim()) {
      continue;
    }
    if (node.parentElement?.closest('[data-no-translate="true"]')) {
      continue;
    }
    textNodes.push(node);
  }

  for (const node of textNodes) {
    if (!textOrigins.has(node)) {
      textOrigins.set(node, node.nodeValue ?? "");
    }

    const original = textOrigins.get(node) ?? node.nodeValue ?? "";
    node.nodeValue = translate(original, language);
  }

  const elements = root.querySelectorAll<HTMLElement>("*");
  for (const element of elements) {
    if (element.closest('[data-no-translate="true"]')) {
      continue;
    }

    const tracked = attrOrigins.get(element) ?? {};
    const attributes = ["placeholder", "aria-label", "title", "value"];

    for (const attr of attributes) {
      if (!element.hasAttribute(attr)) {
        continue;
      }

      if (!(attr in tracked)) {
        tracked[attr] = element.getAttribute(attr) ?? "";
      }

      const original = tracked[attr] ?? "";
      element.setAttribute(attr, translate(original, language));
    }

    attrOrigins.set(element, tracked);
  }

  root.lang = language;
  root.dir = rtlLanguages.has(language) ? "rtl" : "ltr";
}

export function getLanguageLabel(language: AppLanguage) {
  return languageNames[language];
}
