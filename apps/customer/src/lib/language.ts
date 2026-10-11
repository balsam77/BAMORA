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
  "الإجمالي:": { en: "Total:", he: "סה\"כ:" },
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
  "وجهتك للتسوق الفاخر.": { en: "Your destination for luxury shopping.", he: "היעד שלך לקניות יוקרה." },
  "تعذر تحميل بيانات العميل": { en: "Unable to load customer data", he: "לא ניתן לטעון את נתוני הלקוח" },
  "يرجى تعبئة جميع الحقول المطلوبة": { en: "Please fill in all required fields", he: "יש למלא את כל השדות הנדרשים" },
  "تعذر إتمام العملية": { en: "Could not complete the operation", he: "לא ניתן להשלים את הפעולה" },
  "القطع الأنيقة الجاهزة لك": { en: "Elegant pieces ready for you", he: "פריטים אלגנטיים שמוכנים בשבילך" },
  "صفِّح المنتجات حسب النوع والمناسبة أو اللون واحصل على أفضل الاقتراحات.": { en: "Browse products by type, occasion, or color and get the best suggestions.", he: "עיין במוצרים לפי סוג, אירוע או צבע וקבל את ההמלצות הטובות ביותר." },
  "ابحث عن إطلالة": { en: "Find a look", he: "מצא לוק" },
  "أفكار هدايا": { en: "Gift ideas", he: "רעיונות למתנות" },
  "ابحث عن منتج أو لون أو مقاس": { en: "Search for a product, color, or size", he: "חפש מוצר, צבע או מידה" },
  "بحث": { en: "Search", he: "חיפוש" },
  "الكل": { en: "All", he: "הכול" },
  "فساتين": { en: "Dresses", he: "שמלות" },
  "حقائب": { en: "Bags", he: "תיקים" },
  "السعر": { en: "Price", he: "מחיר" },
  "اللون": { en: "Color", he: "צבע" },
  "الأكثر مبيعًا": { en: "Best sellers", he: "הנמכרים ביותר" },
  "المنتجات الأكثر طلبًا": { en: "Most requested products", he: "המוצרים המבוקשים ביותר" },
  "اختيار مميز": { en: "Featured pick", he: "בחירה מומלצת" },
  "أحدث القطع المتاحة": { en: "Latest available pieces", he: "הפריטים החדשים הזמינים" },
  "اكتشف الآن": { en: "Discover now", he: "גלה עכשיו" },
  "اختر القطعة": { en: "Choose item", he: "בחר פריט" },
  "قيّم المنتج": { en: "Rate product", he: "דרג מוצר" },
  "لا يوجد خصم بعد": { en: "No discount yet", he: "עדיין אין הנחה" },
  "اختياراتك المفضلة": { en: "Your favorite picks", he: "הבחירות המועדפות שלך" },
  "استعرض قطعتك المختارة وأضفها إلى السلة بنقرة واحدة.": { en: "Review your selected item and add it to cart with one tap.", he: "סקור את הפריט שבחרת והוסף לעגלה בלחיצה אחת." },
  "عروض حصرية لك": { en: "Exclusive offers for you", he: "מבצעים בלעדיים בשבילך" },
  "خصم 30% على جميع المنتجات": { en: "30% off all products", he: "30% הנחה על כל המוצרים" },
  "تسوق الآن واستفد من العروض المحدودة قبل نفاد الكمية.": { en: "Shop now and enjoy limited offers before they run out.", he: "קנה עכשיו ותיהנה ממבצעים מוגבלים לפני שייגמר." },
  "خصم 30%": { en: "30% OFF", he: "30% הנחה" },
  "تسوق الآن": { en: "Shop now", he: "קנה עכשיו" },
  "عروض لفترة محدودة": { en: "Limited-time offers", he: "מבצעים לזמן מוגבל" },
  "أحدث التخفيضات": { en: "Latest discounts", he: "ההנחות האחרונות" },
  "عرض العرض": { en: "View offer", he: "הצג מבצע" },
  "تفاصيل المنتج": { en: "Product details", he: "פרטי מוצר" },
  "بدون خصم": { en: "No discount", he: "ללא הנחה" },
  "فستان سهرة أنيق مصنوع من قماش عالي الجودة للمناسبات الخاصة.": { en: "An elegant evening dress made from premium fabric for special occasions.", he: "שמלת ערב אלגנטית מבד איכותי לאירועים מיוחדים." },
  "أضف إلى السلة": { en: "Add to cart", he: "הוסף לעגלה" },
  "شراء الآن": { en: "Buy now", he: "קנה עכשיו" },
  "إزالة من المفضلة": { en: "Remove from favorites", he: "הסר מהמועדפים" },
  "إضافة إلى المفضلة": { en: "Add to favorites", he: "הוסף למועדפים" },
  "إتمام الطلب": { en: "Complete order", he: "השלם הזמנה" },
  "الدفع والشحن": { en: "Payment and shipping", he: "תשלום ומשלוח" },
  "المنتج المختار": { en: "Selected product", he: "מוצר נבחר" },
  "التوصيل خلال 48 ساعة": { en: "Delivery within 48 hours", he: "משלוח בתוך 48 שעות" },
  "العنوان": { en: "Address", he: "כתובת" },
  "طريقة الدفع": { en: "Payment method", he: "אמצעי תשלום" },
  "تأكيد الطلب": { en: "Confirm order", he: "אשר הזמנה" },
  "تمت العملية": { en: "Done", he: "בוצע" },
  "تم تأكيد طلبك بنجاح": { en: "Your order was confirmed successfully", he: "ההזמנה שלך אושרה בהצלחה" },
  "العودة للرئيسية": { en: "Back to home", he: "חזרה לדף הבית" },
  "متابعة التسوق": { en: "Continue shopping", he: "המשך קנייה" },
  "تقييم المنتج": { en: "Product rating", he: "דירוג מוצר" },
  "تقييم متوسط": { en: "Average rating", he: "דירוג ממוצע" },
  "أضف تقييمًا واحدًا أكثر للحصول على خصم": { en: "Add one more rating to get a discount", he: "הוסף דירוג אחד נוסף כדי לקבל הנחה" },
  "اكتب تقييمك": { en: "Write your review", he: "כתוב את הביקורת שלך" },
  "شارك تجربتك مع هذا المنتج...": { en: "Share your experience with this product...", he: "שתף את החוויה שלך עם מוצר זה..." },
  "إضافة صورة": { en: "Add image", he: "הוסף תמונה" },
  "إرسال التقييم": { en: "Submit review", he: "שלח דירוג" },
  "تم إرسال تقييمك بنجاح، شكرًا لمشاركتك.": { en: "Your review was submitted successfully, thank you.", he: "הדירוג נשלח בהצלחה, תודה על השיתוף." },
  "مركز المساعدة": { en: "Help center", he: "מרכז עזרה" },
  "تحتاج مساعدة؟": { en: "Need help?", he: "צריך עזרה?" },
  "ابحث عن إجابة...": { en: "Search for an answer...", he: "חפש תשובה..." },
  "ابحث في المساعدة": { en: "Search in help", he: "חפש בעזרה" },
  "كيف يمكنني تتبع طلبي؟": { en: "How can I track my order?", he: "איך אפשר לעקוב אחרי ההזמנה שלי?" },
  "ما هي طرق الدفع المتاحة؟": { en: "What payment methods are available?", he: "אילו אמצעי תשלום זמינים?" },
  "ما سياسة الإرجاع والاستبدال؟": { en: "What is the return and exchange policy?", he: "מה מדיניות ההחזרה וההחלפה?" },
  "كم تستغرق مدة التوصيل؟": { en: "How long does delivery take?", he: "כמה זמן לוקח המשלוח?" },
  "من صفحة حسابي ← تتبع الطلب، ستجد كل تحديثات الشحن لحظيًا.": { en: "From My Account → Order Tracking, you can see live shipping updates.", he: "מדף החשבון שלי ← מעקב הזמנה, תמצא את כל עדכוני המשלוח בזמן אמת." },
  "ندعم PayPal وApple Pay والبطاقات الائتمانية والتحويل المباشر.": { en: "We support PayPal, Apple Pay, credit cards, and direct transfer.", he: "אנחנו תומכים ב-PayPal, Apple Pay, כרטיסי אשראי והעברה ישירה." },
  "يمكنك طلب الإرجاع أو الاستبدال خلال 14 يومًا من تاريخ الاستلام.": { en: "You can request a return or exchange within 14 days of delivery.", he: "ניתן לבקש החזרה או החלפה תוך 14 ימים ממועד המסירה." },
  "عادة خلال 24-72 ساعة حسب المدينة وشركة الشحن.": { en: "Usually within 24-72 hours depending on city and carrier.", he: "בדרך כלל תוך 24-72 שעות לפי העיר וחברת המשלוח." },
  "الإجابة": { en: "Answer", he: "תשובה" },
  "تواصل مباشر": { en: "Direct contact", he: "יצירת קשר ישירה" },
  "لأي سؤال أو طلب، نحن هنا لخدمتك": { en: "For any question or request, we are here for you", he: "לכל שאלה או בקשה, אנחנו כאן בשבילך" },
  "أرسل لنا رسالة سريعة أو اختر طريقة الاتصال المفضلة لديك.": { en: "Send us a quick message or choose your preferred contact method.", he: "שלח לנו הודעה מהירה או בחר את דרך ההתקשרות המועדפת עליך." },
  "واتساب": { en: "WhatsApp", he: "וואטסאפ" },
  "مكالمة": { en: "Call", he: "שיחה" },
  "الاسم": { en: "Name", he: "שם" },
  "رسالتك": { en: "Your message", he: "ההודעה שלך" },
  "اكتب طلبك أو سؤالك هنا": { en: "Write your request or question here", he: "כתוב כאן את הבקשה או השאלה שלך" },
  "إرسال الرسالة": { en: "Send message", he: "שלח הודעה" },
  "تم استلام رسالتك وسنتواصل معك قريبًا.": { en: "Your message was received and we will contact you soon.", he: "הודעתך התקבלה וניצור איתך קשר בקרוב." },
  "طلباتي": { en: "My orders", he: "ההזמנות שלי" },
  "تتبع الطلب": { en: "Order tracking", he: "מעקב הזמנה" },
  "عناويني": { en: "My addresses", he: "הכתובות שלי" },
  "طرق الدفع": { en: "Payment methods", he: "אמצעי תשלום" },
  "معلوماتي الشخصية": { en: "My personal info", he: "המידע האישי שלי" },
  "إعدادات الحساب": { en: "Account settings", he: "הגדרות חשבון" },
  "الإعدادات": { en: "Settings", he: "הגדרות" },
  "معلومات آمنة": { en: "Secure info", he: "מידע מאובטח" },
  "الإشعارات": { en: "Notifications", he: "התראות" },
  "تم إنشاء الطلب": { en: "Order created", he: "ההזמנה נוצרה" },
  "عرض التفاصيل": { en: "View details", he: "הצג פרטים" },
  "الكمية:": { en: "Quantity:", he: "כמות:" },
  "اللون:": { en: "Color:", he: "צבע:" },
  "المقاس:": { en: "Size:", he: "מידה:" },
  "السعر:": { en: "Price:", he: "מחיר:" },
  "قيد المراجعة": { en: "Under review", he: "בבדיקה" },
  "جاري التجهيز": { en: "Preparing", he: "בהכנה" },
  "تم الشحن": { en: "Shipped", he: "נשלח" },
  "تم التسليم": { en: "Delivered", he: "נמסר" },
  "ملغي": { en: "Cancelled", he: "בוטל" },
  "في طريقه إليك": { en: "On the way to you", he: "בדרך אליך" },
  "لا توجد طلبات حتى الآن.": { en: "No orders yet.", he: "אין עדיין הזמנות." },
  "اختر عنوان التوصيل": { en: "Choose delivery address", he: "בחר כתובת משלוח" },
  "تعديل العنوان": { en: "Edit address", he: "ערוך כתובת" },
  "تعديل": { en: "Edit", he: "עריכה" },
  "أضف عنوانًا جديدًا": { en: "Add a new address", he: "הוסף כתובת חדשה" },
  "إضافة عنوان جديد": { en: "Add new address", he: "הוסף כתובת חדשה" },
  "تأكيد العنوان": { en: "Confirm address", he: "אשר כתובת" },
  "تمت إضافة عنوان جديد": { en: "A new address was added", he: "נוספה כתובת חדשה" },
  "ضبط حساب": { en: "Manage account", he: "ניהול חשבון" },
  "تم ضبط اللغة العربية كلغة افتراضية": { en: "Arabic was set as default language", he: "הערבית הוגדרה כשפת ברירת מחדל" },
  "العملة": { en: "Currency", he: "מטבע" },
  "تم تثبيت العملة على ILS": { en: "Currency was set to ILS", he: "המטבע הוגדר ל-ILS" },
  "الإشعارات مفعّلة": { en: "Notifications enabled", he: "ההתראות הופעלו" },
  "الخصوصية والضمان": { en: "Privacy and warranty", he: "פרטיות ואחריות" },
  "الشروط": { en: "Terms", he: "תנאים" },
  "تم فتح الشروط والأحكام": { en: "Terms and conditions opened", he: "התנאים וההגבלות נפתחו" },
  "فتح": { en: "Open", he: "פתח" },
  "عن BAMORA": { en: "About BAMORA", he: "על BAMORA" },
  "BAMORA منصة تسوق فاخرة بتجربة مخصصة": { en: "BAMORA is a luxury shopping platform with a personalized experience", he: "BAMORA היא פלטפורמת קניות יוקרה עם חוויה מותאמת אישית" },
  "إدارة الدفع": { en: "Payment management", he: "ניהול תשלום" },
  "افتراضية": { en: "Default", he: "ברירת מחדל" },
  "ثانوية": { en: "Secondary", he: "משנית" },
  "مفعّل": { en: "Enabled", he: "פעיל" },
  "جاهز": { en: "Ready", he: "מוכן" },
  "تم اختيار": { en: "Selected", he: "נבחר" },
  "إضافة بطاقة جديدة": { en: "Add new card", he: "הוסף כרטיס חדש" },
  "تم فتح نموذج إضافة بطاقة جديدة": { en: "Add-new-card form opened", he: "טופס הוספת כרטיס חדש נפתח" },
  "حفظ التفضيلات": { en: "Save preferences", he: "שמור העדפות" },
  "تم حفظ تفضيلات الدفع": { en: "Payment preferences saved", he: "העדפות התשלום נשמרו" },
  "البيانات الشخصية": { en: "Personal data", he: "נתונים אישיים" },
  "رقم الهاتف": { en: "Phone number", he: "מספר טלפון" },
  "تم حفظ المعلومات الشخصية": { en: "Personal info saved", he: "המידע האישי נשמר" },
  "قائمة محفوظة": { en: "Saved list", he: "רשימה שמורה" },
  "المفضلة من الحساب": { en: "Account favorites", he: "מועדפים מהחשבון" },
  "العودة للحساب": { en: "Back to account", he: "חזרה לחשבון" },
  "الأمان": { en: "Security", he: "אבטחה" },
  "تأكيد": { en: "Confirm", he: "אישור" },
  "هل أنت متأكد أنك تريد تسجيل الخروج من حسابك الآن؟": { en: "Are you sure you want to sign out of your account now?", he: "האם אתה בטוח שברצונך להתנתק מהחשבון עכשיו?" },
  "مرآة BAMORA": { en: "BAMORA mirror", he: "מראת BAMORA" },
  "جرّب الإطلالة قبل الشراء": { en: "Try the look before buying", he: "נסה את הלוק לפני הקנייה" },
  "إغلاق": { en: "Close", he: "סגור" },
  "عرض في المرآة": { en: "View in mirror", he: "הצג במראה" },
  "إنشاء الحساب": { en: "Create account", he: "יצירת חשבון" },
  "الدور الحالي:": { en: "Current role:", he: "תפקיד נוכחי:" },
  "اختر نوع الحساب": { en: "Choose account type", he: "בחר סוג חשבון" },
  "Customer": { en: "Customer", he: "לקוח" },
  "Merchant": { en: "Merchant", he: "סוחר" },
  "Super Admin": { en: "Super Admin", he: "מנהל-על" },
  "وصل حديثًا": { en: "New arrivals", he: "הגיעו לאחרונה" },
  "بدل وتفصيل": { en: "Suits and tailoring", he: "חליפות ותפירה" },
  "جاكيتات ومعاطف": { en: "Jackets and coats", he: "ז'קטים ומעילים" },
  "قمصان": { en: "Shirts", he: "חולצות" },
  "أحذية": { en: "Shoes", he: "נעליים" },
  "إكسسوارات": { en: "Accessories", he: "אקססוריז" },
  "عناية": { en: "Care", he: "טיפוח" },
  "ماركات": { en: "Brands", he: "מותגים" },
  "جديد": { en: "New", he: "חדש" },
  "القسم": { en: "Section", he: "קטגוריה" },
  "دفع بالبطاقة": { en: "Card payment", he: "תשלום בכרטיס" },
  "تحويل مباشر للحساب": { en: "Direct account transfer", he: "העברה ישירה לחשבון" },
  "دفع سريع عبر الجوال": { en: "Fast mobile payment", he: "תשלום מהיר בנייד" },
  "دفع آمن عبر الإنترنت": { en: "Secure online payment", he: "תשלום מאובטח באינטרנט" },
"رجالي": { en: "Men", he: "גברים" },
"نسائي": { en: "Women", he: "נשים" },
"أطفال": { en: "Children", he: "ילדים" },
"نظارات": { en: "Glasses", he: "משקפיים" },
"شنط": { en: "Bags", he: "תיקים" },
"عطور": { en: "Perfumes", he: "בשמים" },
"مكياج": { en: "Makeup", he: "איפור" },
"إلكترونيات": { en: "Electronics", he: "אלקטרוניקה" },
"منزلي": { en: "Home & Living", he: "בית ומגורים" },
"رياضة": { en: "Sports", he: "ספורט" },
  "تسوّق أروع القطع العربية والعالمية": { en: "Shop the finest Arabic and global pieces", he: "קנה את הפריטים הערביים והבינלאומיים המובחרים" },
  "اختبر تجربة تسوق خصيصًا لك مع تشكيلات راقية وخدمة سريعة.": { en: "Enjoy a shopping experience tailored for you with premium collections and fast service.", he: "חווה קנייה מותאמת אישית עם קולקציות יוקרה ושירות מהיר." },
  "عرض كل العروض": { en: "View all offers", he: "צפה בכל המבצעים" },
  "منتج مميز من BAMORA.": { en: "A featured BAMORA product.", he: "מוצר מומלץ של BAMORA." },
  "لا توجد منتجات في هذا التصنيف حاليًا.": { en: "No products in this category right now.", he: "אין מוצרים בקטגוריה זו כרגע." },
  "تطبيق الفلاتر": { en: "Apply filters", he: "החל מסננים" },
  "✨ المرآة": { en: "✨ Mirror", he: "✨ מראה" },

"أحدث العروض": { en: "Latest offers", he: "המבצעים האחרונים" },
"تشكيلة مميزة": { en: "Featured collection", he: "מבחר מיוחד" },
"منتجات مختارة لإكمال إطلالتك بأناقة.": {
  en: "Selected products to complete your look in style.",
  he: "מוצרים נבחרים להשלמת המראה שלך בסטייל."
},
"حقيبة جلد فاخرة": {
  en: "Luxury leather bag",
  he: "תיק עור יוקרתי"
},
"تصميم جلد فاخر مع لمسات ذهبية لكل المناسبات.": {
  en: "Luxury leather design with golden touches for every occasion.",
  he: "עיצוב עור יוקרתי עם נגיעות זהב לכל אירוע."
},
"ساعة كلاسيكية": {
  en: "Classic watch",
  he: "שעון קלאסי"
},
"تصميم دقيق ولمسات ذهبية تضفي لمسة فاخرة.": {
  en: "Precise design with golden touches for a luxurious finish.",
  he: "עיצוב מדויק עם נגיעות זהב המעניקות מראה יוקרתי."
},
"ابدأ الآن": {
  en: "Start now",
  he: "התחל עכשיו"
},
"اختر منتجًا": {
  en: "Choose a product",
  he: "בחר מוצר"
},
"عرض المنتج": {
  en: "View product",
  he: "צפה במוצר"
},
};
const reverseDictionary: Record<string, string> = Object.entries(dictionary).reduce<Record<string, string>>((acc, [ar, translated]) => {
  acc[translated.en] = ar;
  acc[translated.he] = ar;
  return acc;
}, {});

const arabicMonthsToEnglish: Record<string, string> = {
  "يناير": "January",
  "فبراير": "February",
  "مارس": "March",
  "أبريل": "April",
  "ابريل": "April",
  "مايو": "May",
  "يونيو": "June",
  "يوليو": "July",
  "أغسطس": "August",
  "اغسطس": "August",
  "سبتمبر": "September",
  "أكتوبر": "October",
  "اكتوبر": "October",
  "نوفمبر": "November",
  "ديسمبر": "December",
};

function translateArabicMonth(value: string) {
  return Object.entries(arabicMonthsToEnglish).reduce((result, [arMonth, enMonth]) => {
    return result.replace(new RegExp(arMonth, "g"), enMonth);
  }, value);
}

function normalizeArabicMeridiem(value: string) {
  const cleaned = value.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
  return cleaned.replace(/\s*ص(?=\s|$)/g, " AM").replace(/\s*م(?=\s|$)/g, " PM");
}

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
  const normalizedTrimmed = trimmed.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
  const canonicalSource = reverseDictionary[trimmed] ?? reverseDictionary[normalizedTrimmed] ?? normalizedTrimmed;
  const index = source.indexOf(trimmed);
  const spacingPrefix = index >= 0 ? source.slice(0, index) : "";
  const spacingSuffix = index >= 0 ? source.slice(index + trimmed.length) : "";

  if (language === "ar") {
    if (reverseDictionary[trimmed]) {
      return `${spacingPrefix}${reverseDictionary[trimmed]}${spacingSuffix}`;
    }

    if (reverseDictionary[normalizedTrimmed]) {
      return `${spacingPrefix}${reverseDictionary[normalizedTrimmed]}${spacingSuffix}`;
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

  if (dictionary[canonicalSource]) {
    return `${spacingPrefix}${dictionary[canonicalSource][language]}${spacingSuffix}`;
  }

  if (trimmed.startsWith("قسم ")) {
    const value = trimmed.slice(4);
    const label = language === "en" ? "Section" : "קטגוריה";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (trimmed.startsWith("عرض ") && trimmed.endsWith(" نتيجة")) {
    const value = trimmed.slice(4, trimmed.length - " نتيجة".length).trim();
    if (language === "en") {
      return `${spacingPrefix}Showing ${value} results${spacingSuffix}`;
    }
    return `${spacingPrefix}מציג ${value} תוצאות${spacingSuffix}`;
  }

  if (trimmed.startsWith("خصم ") && trimmed.endsWith("%")) {
    const value = trimmed.slice("خصم ".length);
    if (language === "en") {
      return `${spacingPrefix}${value} off${spacingSuffix}`;
    }
    return `${spacingPrefix}הנחה ${value}${spacingSuffix}`;
  }

  if (canonicalSource.startsWith("تاريخ الطلب ")) {
    const value = canonicalSource.slice("تاريخ الطلب ".length);
    const label = language === "en" ? "Order date" : "תאריך הזמנה";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (canonicalSource === "تاريخ الطلب") {
    return `${spacingPrefix}${language === "en" ? "Order date" : "תאריך הזמנה"}${spacingSuffix}`;
  }

  if (trimmed.startsWith("تم استلام طلب ") && trimmed.includes(" بقيمة ")) {
    const orderPart = trimmed.slice("تم استلام طلب ".length);
    const split = orderPart.split(" بقيمة ");
    const item = split[0] ?? "";
    const amount = split[1]?.replace("، وسيصلك تحديث الشحن قريبًا.", "") ?? "";
    if (language === "en") {
      return `${spacingPrefix}Your order for ${item} amounting to ${amount} was received, and shipping updates will arrive soon.${spacingSuffix}`;
    }
    return `${spacingPrefix}ההזמנה שלך עבור ${item} בסכום ${amount} התקבלה, ועדכון משלוח יישלח בקרוב.${spacingSuffix}`;
  }

  if (trimmed.startsWith("رقم الطلب ") && trimmed.endsWith(" قيد المعالجة الآن.")) {
    const value = trimmed.slice("رقم الطلب ".length, trimmed.length - " قيد المعالجة الآن.".length).trim();
    if (language === "en") {
      return `${spacingPrefix}Order number ${value} is now being processed.${spacingSuffix}`;
    }
    return `${spacingPrefix}מספר הזמנה ${value} נמצא כעת בעיבוד.${spacingSuffix}`;
  }

  if (trimmed.startsWith("تم اختيار ")) {
    const value = trimmed.slice("تم اختيار ".length);
    if (language === "en") {
      return `${spacingPrefix}Selected ${value}${spacingSuffix}`;
    }
    return `${spacingPrefix}נבחר ${value}${spacingSuffix}`;
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

  const quantityMatch = normalizedTrimmed.match(/^الكمية\s*:\s*(.+)$/);
  if (quantityMatch) {
    const value = quantityMatch[1];
    const label = language === "en" ? "Quantity:" : "כמות:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  const colorMatch = normalizedTrimmed.match(/^اللون\s*:\s*(.+)$/);
  if (colorMatch) {
    const value = colorMatch[1];
    const label = language === "en" ? "Color:" : "צבע:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  const sizeMatch = normalizedTrimmed.match(/^المقاس\s*:\s*(.+)$/);
  if (sizeMatch) {
    const value = sizeMatch[1];
    const label = language === "en" ? "Size:" : "מידה:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  const priceMatch = normalizedTrimmed.match(/^السعر\s*:\s*(.+)$/);
  if (priceMatch) {
    const value = priceMatch[1];
    const label = language === "en" ? "Price:" : "מחיר:";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  if (canonicalSource.startsWith("الوقت المتوقع ")) {
    const value = canonicalSource.slice("الوقت المتوقع ".length);
    if (language === "en") {
      return `${spacingPrefix}Expected time ${normalizeArabicMeridiem(translateArabicMonth(value))}${spacingSuffix}`;
    }
    return `${spacingPrefix}זמן משוער ${normalizeArabicMeridiem(translateArabicMonth(value))}${spacingSuffix}`;
  }

  if ((language === "en" || language === "he") && /\d+\s+مايو/.test(canonicalSource)) {
    return `${spacingPrefix}${normalizeArabicMeridiem(translateArabicMonth(canonicalSource))}${spacingSuffix}`;
  }

  if ((language === "en" || language === "he") && /\d{1,2}:\d{2}\s*[صم]/.test(canonicalSource)) {
    return `${spacingPrefix}${normalizeArabicMeridiem(canonicalSource)}${spacingSuffix}`;
  }

  if (language === "he" && (canonicalSource === "new" || canonicalSource === "NEW")) {
    return `${spacingPrefix}חדש${spacingSuffix}`;
  }

  if (language === "en" && canonicalSource === "NEW") {
    return `${spacingPrefix}NEW${spacingSuffix}`;
  }

  if (trimmed.startsWith("العودة إلى ")) {
    const value = trimmed.slice("العودة إلى ".length);
    const label = language === "en" ? "Back to" : "חזרה אל";
    return `${spacingPrefix}${label} ${value}${spacingSuffix}`;
  }

  const reviewCountMatch = trimmed.match(/^(\d+)\s+تقييم$/);
  if (reviewCountMatch) {
    const count = reviewCountMatch[1];
    if (language === "en") {
      return `${spacingPrefix}${count} reviews${spacingSuffix}`;
    }
    return `${spacingPrefix}${count} ביקורות${spacingSuffix}`;
  }

  return source;
}

export function applyRuntimeTranslations(root: HTMLElement, language: AppLanguage) {
  const documentRef = root.ownerDocument;
  const direction = rtlLanguages.has(language) ? "rtl" : "ltr";

  documentRef.documentElement.lang = language;
  documentRef.documentElement.dir = direction;

  const shouldSkip = (element: Element | null) => Boolean(element?.closest("[data-no-translate='true']"));

  const textWalker = documentRef.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    const node = textNode as Text;
    const parent = node.parentElement;
    const currentValue = node.nodeValue ?? "";

    if (parent && !shouldSkip(parent) && currentValue.trim()) {
      node.nodeValue = translate(currentValue, language);
    }

    textNode = textWalker.nextNode();
  }

  const translatableAttributes = ["placeholder", "aria-label", "title"];
  const elements = root.querySelectorAll("*");
  for (const element of elements) {
    if (shouldSkip(element)) {
      continue;
    }

    for (const attribute of translatableAttributes) {
      const value = element.getAttribute(attribute);
      if (!value) {
        continue;
      }

      element.setAttribute(attribute, translate(value, language));
    }
  }

}

export function getLanguageLabel(language: AppLanguage) {
  return languageNames[language];
}

export function getLanguagePickerLabel(language: AppLanguage) {
  if (language === "en") {
    return `Language: ${getLanguageLabel(language)}`;
  }

  if (language === "he") {
    return `שפה: ${getLanguageLabel(language)}`;
  }

  return `اللغة: ${getLanguageLabel(language)}`;
}
