import { LegalPageFrame } from "@/components/legal/LegalPageFrame";

export default function AboutPage() {
  return (
    <LegalPageFrame
      activeHref="/about"
      title={{
        ar: "عن BAMORA",
        he: "אודות BAMORA",
        en: "About BAMORA",
      }}
      intro={{
        ar: "BAMORA منصة Marketplace تربط الزبائن بالتجار ضمن تجربة شراء موحدة وسهلة، وتتيح اكتشاف المنتجات وطلبها من مكان واحد.",
        he: "BAMORA היא פלטפורמת מרקטפלייס שמחברת בין לקוחות לסוחרים בחוויית קנייה אחת, פשוטה ונוחה.",
        en: "BAMORA is a marketplace platform connecting customers and merchants in one seamless shopping experience.",
      }}
      sections={[
        {
          heading: {
            ar: "رؤيتنا",
            he: "החזון שלנו",
            en: "Our vision",
          },
          paragraphs: [
            {
              ar: "نركز على تسهيل الشراء من عدة متاجر عبر منصة واحدة مع واجهة واضحة وسريعة على الهاتف والكمبيوتر.",
              he: "אנחנו מתמקדים בהפיכת הקנייה ממספר חנויות לקלה דרך פלטפורמה אחת ברורה ומהירה בנייד ובמחשב.",
              en: "We focus on simplifying multi-merchant shopping through one clear and fast platform on mobile and desktop.",
            },
          ],
        },
        {
          heading: {
            ar: "كيف يعمل BAMORA",
            he: "איך BAMORA פועלת",
            en: "How BAMORA works",
          },
          paragraphs: [
            {
              ar: "يتصفح العميل المنتجات، يختار الأنسب له، ويكمل عملية الشراء ضمن تجربة موحدة، بينما يدير كل تاجر منتجاته وطلباته من لوحة مخصصة.",
              he: "הלקוח גולש במוצרים, בוחר את המתאים לו ומשלים רכישה בחוויה מאוחדת, בעוד שכל סוחר מנהל את המוצרים וההזמנות שלו מלוח ניהול ייעודי.",
              en: "Customers discover products and complete purchases in a unified flow, while each merchant manages products and orders from a dedicated dashboard.",
            },
          ],
        },
      ]}
    />
  );
}
