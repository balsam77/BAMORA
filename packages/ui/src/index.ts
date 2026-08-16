export const colors = {
  black: "#000000",
  jet: "#090909",
  charcoal: "#141414",
  onyx: "#1e1e1e",
  white: "#ffffff",
  softWhite: "#f3f1ec",
  gold: "#c9a962",
  goldLight: "#e8d5a3",
  goldDark: "#a68b4b",
} as const;

export const homepageCards = [
  {
    id: "gift",
    titleEn: "Find a gift",
    titleAr: "هدية",
    slug: "gift",
  },
  {
    id: "outfit",
    titleEn: "Complete my outfit",
    titleAr: "أكمل إطلالتي",
    slug: "outfit",
  },
  {
    id: "home",
    titleEn: "Refresh my home",
    titleAr: "جدّد بيتي",
    slug: "home",
  },
  {
    id: "baby",
    titleEn: "Baby essentials",
    titleAr: "مستلزمات baby",
    slug: "baby",
  },
  {
    id: "occasion",
    titleEn: "I have an occasion",
    titleAr: "عندي مناسبة",
    slug: "occasion",
  },
  {
    id: "explore",
    titleEn: "Just exploring",
    titleAr: "استكشاف فقط",
    slug: "explore",
  },
] as const;

export const categoryTiles = [
  { id: "womens", titleEn: "Women", titleAr: "نسائي", slug: "women" },
  { id: "mens", titleEn: "Men", titleAr: "رجالي", slug: "men" },
  { id: "kids", titleEn: "Kids", titleAr: "أطفال", slug: "kids" },
  { id: "kitchen", titleEn: "Kitchen", titleAr: "مطبخ", slug: "kitchen" },
  { id: "bath", titleEn: "Bath", titleAr: "حمام", slug: "bath" },
  { id: "salon", titleEn: "Salon", titleAr: "صالون", slug: "salon" },
] as const;

export const featuredProducts = [
  {
    id: "velvet-evening-gown",
    titleEn: "Velvet Evening Gown",
    titleAr: "فستان سهرة مخملي",
    price: "₪549",
    detail: "Black velvet with gold shimmer details.",
  },
  {
    id: "gold-sequin-midi",
    titleEn: "Gold Sequin Midi Dress",
    titleAr: "فستان ميدي بترتر ذهبي",
    price: "₪399",
    detail: "Soft sequin tulle for evening elegance.",
  },
  {
    id: "floral-summer-maxi",
    titleEn: "Floral Summer Maxi",
    titleAr: "ماكسي صيفي مزهر",
    price: "₪275",
    detail: "Light chiffon with delicate floral print.",
  },
  {
    id: "lace-overlay-dress",
    titleEn: "Lace Overlay Dress",
    titleAr: "فستان دانتيل",
    price: "₪610",
    detail: "Elegant lace detail with premium finish.",
  },
] as const;

export const paymentMethods = [
  { id: "paypal", title: "PayPal", subtitle: "Online Secure Payment" },
  { id: "applepay", title: "Apple Pay", subtitle: "Instant Mobile Payment" },
  { id: "pit", title: "pit", subtitle: "Direct Account Transfer" },
  { id: "card", title: "Visa / Mastercard", subtitle: "Credit / Debit Card" },
] as const;

export const helpTopics = [
  { id: "delivery", titleEn: "Delivery questions", titleAr: "أسئلة التسليم" },
  { id: "returns", titleEn: "Returns & refunds", titleAr: "المرتجعات والاسترداد" },
  { id: "payment", titleEn: "Payment issues", titleAr: "مشاكل الدفع" },
  { id: "orders", titleEn: "Track order status", titleAr: "تتبع حالة الطلب" },
];

export const merchantNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "settings", label: "Settings" },
] as const;

export function getDailyMessage(date = new Date()): {
  en: string;
  ar: string;
} {
  const messages = [
    {
      en: "Luxury is not about price — it is about how you feel.",
      ar: "الفخامة ليست في السعر — بل في ما تشعر به.",
    },
    {
      en: "Every detail matters when it is chosen with care.",
      ar: "كل تفصيلة مهمة عندما تُختار بعناية.",
    },
    {
      en: "Today is a good day to treat yourself well.",
      ar: "اليوم يوم جميل لتدلّل نفسك.",
    },
    {
      en: "Quality whispers. You do not have to shout.",
      ar: "الجودة تهمس — لا حاجة للصياح.",
    },
    {
      en: "Begin with intention. The rest will follow.",
      ar: "ابدأ بنية — والباقي يأتي.",
    },
    {
      en: "What you choose reflects who you are becoming.",
      ar: "ما تختاره يعكس من تسعى لتكون.",
    },
    {
      en: "Slow down. Choose well. Enjoy fully.",
      ar: "تمهل. اختر جيداً. استمتع بكل لحظة.",
    },
  ];

  const dayIndex =
    Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
        (1000 * 60 * 60 * 24),
    ) % messages.length;

  return messages[dayIndex]!;
}

export { BamoraLogo } from "./components/BamoraLogo";
export { Button } from "./components/Button";
export { Card } from "./components/Card";
