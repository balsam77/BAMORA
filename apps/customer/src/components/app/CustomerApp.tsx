"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { BamoraLogo, Button, Card } from "@bamora/ui";
import {
  clearRoleSession,
  createCustomerRepository,
  getCurrentRole,
  hasRoleAccess,
  setCurrentRole,
  type CustomerAddress,
  type CustomerNotification,
  type CustomerOrder,
  type CustomerProfile,
  type StorefrontProduct,
} from "@bamora/platform";
import { BrandName } from "@/components/brand/BrandName";
import {
  applyRuntimeTranslations,
  getLanguageLabel,
  getSavedLanguage,
  persistLanguage,
  type AppLanguage,
} from "@/lib/language";
import {
  getDefaultCategories,
  type DynamicCategory,
  resolveDynamicCategories,
} from "@/lib/dynamicCategories";
import styles from "./CustomerApp.module.css";

type PageKey = "home" | "shop" | "favorites" | "offers" | "help" | "profile";

type Product = {
  id: string;
  titleAr: string;
  price: string;
  detail: string;
  reviewCount: number;
  averageRating: number;
};

type MirrorCategory = "women" | "men" | "accessories" | "fragrance";

const imageByProductId: Record<string, string> = {
  "hero-bag": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80",
  "hero-dress": "https://images.unsplash.com/photo-1566479179817-c0b5b4b4b64f?auto=format&fit=crop&w=1200&q=80",
  "hero-watch": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80",
  "fav-bag": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80",
  "fav-dress": "https://images.unsplash.com/photo-1566479179817-c0b5b4b4b64f?auto=format&fit=crop&w=1200&q=80",
  "fav-watch": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=1200&q=80",
  "fav-perfume": "https://images.unsplash.com/photo-1595425964071-45520d41f4b9?auto=format&fit=crop&w=1200&q=80",
  "best-seller-dress": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  "best-seller-bag": "https://images.unsplash.com/photo-1614179689702-355944cd0918?auto=format&fit=crop&w=1200&q=80",
  "best-seller-perfume": "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?auto=format&fit=crop&w=1200&q=80",
  "mirror-women-1": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
  "mirror-women-2": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=80",
  "mirror-men-1": "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=80",
  "mirror-men-2": "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1200&q=80",
  "mirror-acc-1": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
  "mirror-acc-2": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=80",
  "mirror-fr-1": "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=80",
  "mirror-fr-2": "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1200&q=80",
};

const logisticsImages = {
  productDetail: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1400&q=80",
  shippingMap: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
  addressMap: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?auto=format&fit=crop&w=1200&q=80",
} as const;

function getProductImage(productId: string) {
  return imageByProductId[productId] ?? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
}

function getReviewDiscount(reviewCount: number) {
  if (reviewCount >= 20) return 20;
  if (reviewCount >= 10) return 10;
  if (reviewCount >= 5) return 5;
  return 0;
}

function mapStorefrontProduct(product: StorefrontProduct): Product {
  return {
    id: product.id,
    titleAr: product.titleAr,
    price: product.price,
    detail: product.detail,
    reviewCount: product.reviewCount,
    averageRating: product.averageRating,
  };
}

const navItems: { id: PageKey; label: string; icon: string }[] = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "shop", label: "تسوق", icon: "🛍️" },
  { id: "favorites", label: "المفضلة", icon: "❤️" },
  { id: "offers", label: "العروض", icon: "🎁" },
  { id: "help", label: "مساعدة", icon: "❓" },
  { id: "profile", label: "حسابي", icon: "👤" },
];

const offers = [
  {
    id: "golden-hour",
    title: "توفير الساعة الذهبية",
    subtitle: "خصم يصل إلى 30% على الموديلات المميزة",
  },
  {
    id: "bespoke-care",
    title: "باقة العناية الخاصة",
    subtitle: "نصائح تنسيق مجانية مع كل طلب",
  },
  {
    id: "evening-classic",
    title: "مجموعة سهرة كلاسيكية",
    subtitle: "قطع محدودة لمناسبتك الخاصة",
  },
] as const;

const featuredProducts: Product[] = [
  {
    id: "hero-bag",
    titleAr: "حقيبة جلد فاخرة",
    price: "₪799 ILS",
    detail: "تصميم جلد فاخر مع لمسات ذهبية لكل المناسبات.",
    reviewCount: 12,
    averageRating: 4.8,
  },
  {
    id: "hero-dress",
    titleAr: "فستان سهرة أسود",
    price: "₪549 ILS",
    detail: "قصة أنيقة تبرزك في سهرة لا تُنسى.",
    reviewCount: 5,
    averageRating: 4.5,
  },
  {
    id: "hero-watch",
    titleAr: "ساعة كلاسيكية",
    price: "₪1,250 ILS",
    detail: "تصميم دقيق ولمسات ذهبية تضفي لمسة فاخرة.",
    reviewCount: 18,
    averageRating: 4.9,
  },
];

const favoriteProducts: Product[] = [
  {
    id: "fav-bag",
    titleAr: "حقيبة جلد فاخرة",
    price: "₪799 ILS",
    detail: "تصميم أنيق لكل يوم ومناسبة.",
    reviewCount: 8,
    averageRating: 4.6,
  },
  {
    id: "fav-dress",
    titleAr: "فستان سهرة أسود",
    price: "₪549 ILS",
    detail: "فستان ناعم لمظهر أنيق وراقي.",
    reviewCount: 16,
    averageRating: 4.9,
  },
  {
    id: "fav-watch",
    titleAr: "ساعة كلاسيكية",
    price: "₪1,250 ILS",
    detail: "ساعة أنيقة تضيف لمسة فخمة لكل إطلالة.",
    reviewCount: 4,
    averageRating: 4.5,
  },
  {
    id: "fav-perfume",
    titleAr: "عطر ذهبي",
    price: "₪450 ILS",
    detail: "رائحة دافئة ومميزة بعبق العود والعود.",
    reviewCount: 21,
    averageRating: 5.0,
  },
];

const topSellingProducts: Product[] = [
  {
    id: "best-seller-dress",
    titleAr: "فستان سهرة حريري",
    price: "₪620 ILS",
    detail: "فستان حريري متدفق لجاذبية خاصة في كل مناسبة.",
    reviewCount: 24,
    averageRating: 4.9,
  },
  {
    id: "best-seller-bag",
    titleAr: "حقيبة كتف مميزة",
    price: "₪520 ILS",
    detail: "حقيبة بارزة تتماشى مع إطلالات السهرة.",
    reviewCount: 30,
    averageRating: 4.8,
  },
  {
    id: "best-seller-perfume",
    titleAr: "عطر العنبر الشرقي",
    price: "₪390 ILS",
    detail: "رائحة دافئة تعود إليها الزبائن بانتظام.",
    reviewCount: 28,
    averageRating: 4.9,
  },
];

const mirrorCollections: Record<MirrorCategory, Product[]> = {
  women: [
    {
      id: "mirror-women-1",
      titleAr: "فستان مخملي ملكي",
      price: "₪680 ILS",
      detail: "قصة أنثوية مع خامة مريحة للمناسبات المسائية.",
      reviewCount: 14,
      averageRating: 4.8,
    },
    {
      id: "mirror-women-2",
      titleAr: "فستان حرير مزخرف",
      price: "₪590 ILS",
      detail: "تفاصيل ذهبية تضيف حضورًا فاخرًا في كل إطلالة.",
      reviewCount: 9,
      averageRating: 4.6,
    },
  ],
  men: [
    {
      id: "mirror-men-1",
      titleAr: "بليزر كحلي رسمي",
      price: "₪720 ILS",
      detail: "مقاس متوازن وخامة ممتازة للاجتماعات والمناسبات.",
      reviewCount: 11,
      averageRating: 4.7,
    },
    {
      id: "mirror-men-2",
      titleAr: "بدلة رمادية عصرية",
      price: "₪980 ILS",
      detail: "بدلة أنيقة بلمسة حديثة وتفصيل مريح طوال اليوم.",
      reviewCount: 17,
      averageRating: 4.9,
    },
  ],
  accessories: [
    {
      id: "mirror-acc-1",
      titleAr: "حقيبة كتف جلدية",
      price: "₪540 ILS",
      detail: "حقيبة راقية تناسب الإطلالات اليومية والسهرة.",
      reviewCount: 13,
      averageRating: 4.8,
    },
    {
      id: "mirror-acc-2",
      titleAr: "ساعة ذهبي مطفي",
      price: "₪1,080 ILS",
      detail: "ساعة كلاسيكية بإطار أنيق تضيف فخامة لإطلالتك.",
      reviewCount: 19,
      averageRating: 4.9,
    },
  ],
  fragrance: [
    {
      id: "mirror-fr-1",
      titleAr: "عطر العنبر الملكي",
      price: "₪460 ILS",
      detail: "ثبات طويل مع توازن دافئ بين العود والعنبر.",
      reviewCount: 22,
      averageRating: 4.9,
    },
    {
      id: "mirror-fr-2",
      titleAr: "عطر زهري مسائي",
      price: "₪390 ILS",
      detail: "مزيج ناعم يناسب السهرات والمناسبات الخاصة.",
      reviewCount: 10,
      averageRating: 4.7,
    },
  ],
};

const mirrorCategoryLabels: Record<MirrorCategory, string> = {
  women: "نسائي",
  men: "رجالي",
  accessories: "إكسسوارات",
  fragrance: "عطور",
};

function HomeScreen({
  categories,
  featured,
  onStartShopping,
  onOpenOffers,
}: {
  categories: DynamicCategory[];
  featured: Product[];
  onStartShopping: () => void;
  onOpenOffers: () => void;
}) {
  return (
    <div className={styles.screen}>
      <section className={styles.heroCard}>
        <div>
          <span className={styles.sectionTag}>مرحبًا بك مجددًا</span>
          <h1>تسوّق أروع القطع العربية والعالمية</h1>
          <p>
            اختبر تجربة تسوق خصيصًا لك مع تشكيلات راقية وخدمة سريعة.
          </p>
        </div>

        <Button variant="primary" onClick={onStartShopping}>ابدأ التسوق</Button>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>أهم الأقسام</p>
            <h2>اختياراتنا لك</h2>
          </div>
          <Button variant="ghost" onClick={onStartShopping}>عرض الكل</Button>
        </div>

        <div className={styles.tileGrid}>
          {categories.map((tile) => (
            <Card
              key={tile.id}
              title={tile.titleAr}
              subtitle={`اكتشف أفضل القطع في قسم ${tile.titleAr}`}
              className={styles.categoryTile}
            >
              <p>تصفح مجموعة مميزة من {tile.titleAr} المختارة بعناية.</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>أحدث العروض</p>
            <h2>تشكيلة مميزة</h2>
          </div>
          <span className={styles.sectionHint}>منتجات مختارة لإكمال إطلالتك بأناقة.</span>
        </div>

        <div className={styles.productGrid}>
          {featured.map((product) => (
            <Card key={product.id} title={product.titleAr} subtitle={product.price} className={styles.productCard}>
              <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
              <p>{product.detail}</p>
            </Card>
          ))}
        </div>

        <div className={styles.actionRow}>
          <Button variant="ghost" onClick={onOpenOffers}>عرض كل العروض</Button>
        </div>
      </section>
    </div>
  );
}

function ShopScreen({
  categories,
  featuredProducts,
  topSellingProducts,
  onRate,
  onSelectProduct,
  onOpenMirror,
  onOpenOffers,
}: {
  categories: DynamicCategory[];
  featuredProducts: Product[];
  topSellingProducts: Product[];
  onRate: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenMirror: () => void;
  onOpenOffers: () => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState("الكل");
  const [activeSize, setActiveSize] = useState("M");
  const [activeColor, setActiveColor] = useState("#f5c07e");
  const [visibleFeatured, setVisibleFeatured] = useState<Product[]>(featuredProducts);

  useEffect(() => {
    setVisibleFeatured(featuredProducts);
  }, [featuredProducts]);

  const applyFilterSelection = () => {
    const searchTerm = searchValue.trim();
    const filtered = featuredProducts.filter((product) => {
      const byCategory = activeFilter === "الكل" || product.titleAr.includes(activeFilter);
      const bySearch = !searchTerm || product.titleAr.includes(searchTerm) || product.detail.includes(searchTerm);
      return byCategory && bySearch;
    });

    setVisibleFeatured(filtered);
    if (filtered[0]) {
      onSelectProduct(filtered[0]);
    }
  };

  return (
    <div className={styles.screen}>
      <section className={styles.introPanel}>
        <span className={styles.sectionTag}>تسوق</span>
        <h2>القطع الأنيقة الجاهزة لك</h2>
        <p>
          صفِّح المنتجات حسب النوع والمناسبة أو اللون واحصل على أفضل الاقتراحات.
        </p>
        <div className={styles.actionRow}>
          <Button variant="ghost" onClick={onOpenMirror}>ابحث عن إطلالة</Button>
          <Button variant="ghost" onClick={onOpenOffers}>أفكار هدايا</Button>
        </div>
      </section>

      <section className={styles.filtersPanel}>
        <div className={styles.filterRow}>
          <input
            type="search"
            placeholder="ابحث عن منتج أو لون أو مقاس"
            className={styles.filterInput}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button type="button" className={styles.filterSubmit} onClick={applyFilterSelection}>بحث</button>
        </div>

        <div className={styles.chipRow}>
          {['الكل', 'فساتين', 'عطور', 'حقائب', 'إكسسوارات'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={styles.filterChip}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterBox}>
            <p className={styles.sectionTag}>السعر</p>
            <div className={styles.rangeRow}>
              <span>₪2</span>
              <span>₪2,000</span>
            </div>
            <input type="range" min="2" max="2000" defaultValue="550" className={styles.rangeSlider} />
          </div>

          <div className={styles.filterBox}>
            <p className={styles.sectionTag}>المقاس</p>
            <div className={styles.sizeRow}>
              {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={activeSize === size ? styles.sizeButtonActive : styles.sizeButton}
                  onClick={() => setActiveSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBox}>
            <p className={styles.sectionTag}>اللون</p>
            <div className={styles.colorRow}>
              {['#f5c07e', '#c87a4d', '#4d5fa8', '#a84d7f', '#2f3a2c'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={activeColor === color ? styles.colorSwatchActive : styles.colorSwatch}
                  style={{ background: color }}
                  aria-label={`Color ${color}`}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span>عرض {visibleFeatured.length} نتيجة</span>
          <button type="button" className={styles.primaryButton} onClick={applyFilterSelection}>تطبيق الفلاتر</button>
        </div>
      </section>

      <div className={styles.shopGrid}>
        {categories.map((category) => (
          <button key={category.id} className={styles.shopCard} type="button" onClick={onOpenMirror}>
            <span className={styles.shopTitle}>{category.titleAr}</span>
            <span className={styles.shopSub}>قسم {category.titleAr}</span>
          </button>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>الأكثر مبيعًا</p>
            <h2>المنتجات الأكثر طلبًا</h2>
          </div>
          <Button variant="ghost" onClick={onOpenOffers}>عرض الكل</Button>
        </div>

        <div className={styles.productGrid}>
          {topSellingProducts.map((product) => (
            <Card key={product.id} title={product.titleAr} subtitle={product.price} className={styles.productCard}>
              <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
              <p>{product.detail}</p>
              <p className={styles.productAr} dir="rtl" lang="ar">
                {product.titleAr}
              </p>
              <div className={styles.productMeta}>
                <span>⭐ {product.averageRating.toFixed(1)}</span>
                <span>{product.reviewCount} تقييم</span>
                <span>{getReviewDiscount(product.reviewCount) > 0 ? `خصم ${getReviewDiscount(product.reviewCount)}%` : "لا يوجد خصم بعد"}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}> 
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>اختيار مميز</p>
            <h2>أحدث القطع المتاحة</h2>
          </div>
          <Button variant="ghost" onClick={onOpenMirror}>اكتشف الآن</Button>
        </div>
        <div className={styles.productGrid}>
          {visibleFeatured.map((product) => (
            <Card key={product.id} title={product.titleAr} subtitle={product.price} className={styles.productCard}>
              <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
              <p>{product.detail}</p>
              <div className={styles.productMeta}>
                <span>⭐ {product.averageRating.toFixed(1)}</span>
                <span>{product.reviewCount} تقييم</span>
                <span>{getReviewDiscount(product.reviewCount) > 0 ? `خصم ${getReviewDiscount(product.reviewCount)}%` : "لا يوجد خصم بعد"}</span>
              </div>
              <div className={styles.productActions}>
                <button type="button" className={styles.primaryButton} onClick={() => onSelectProduct(product)}>
                  اختر القطعة
                </button>
                <button type="button" className={styles.reviewButton} onClick={() => onRate(product)}>
                  قيّم المنتج
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function FavoritesScreen({
  products,
  onRate,
  onSelectProduct,
}: {
  products: Product[];
  onRate: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}) {
  return (
    <div className={styles.screen}>
      <section className={styles.introPanel}>
        <span className={styles.sectionTag}>المفضلة</span>
        <h2>اختياراتك المفضلة</h2>
        <p>استعرض قطعتك المختارة وأضفها إلى السلة بنقرة واحدة.</p>
      </section>

      <div className={styles.productGrid}>
        {products.map((product) => (
          <Card key={product.id} title={product.titleAr} subtitle={product.price} className={styles.productCard}>
            <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
            <p>{product.detail}</p>
            <div className={styles.productActions}>
              <button type="button" className={styles.primaryButton} onClick={() => onSelectProduct(product)}>
                اختر القطعة
              </button>
              <button type="button" className={styles.reviewButton} onClick={() => onRate(product)}>
                قيّم المنتج
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OffersScreen({ onStartShopping }: { onStartShopping: () => void }) {
  return (
    <div className={styles.screen}>
      <section className={styles.discountHero}>
        <div>
          <span className={styles.sectionTag}>عروض حصرية لك</span>
          <h2>خصم 30% على جميع المنتجات</h2>
          <p>تسوق الآن واستفد من العروض المحدودة قبل نفاد الكمية.</p>
        </div>
        <div className={styles.heroDetails}>
          <span className={styles.discountBadge}>خصم 30%</span>
          <Button variant="primary" onClick={onStartShopping}>تسوق الآن</Button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>عروض لفترة محدودة</p>
            <h2>أحدث التخفيضات</h2>
          </div>
        </div>

        <div className={styles.offerGrid}>
          {offers.map((offer) => (
            <Card key={offer.id} title={offer.title} subtitle={offer.subtitle} className={styles.offerCard}>
              <img src={getProductImage("hero-bag")} alt={offer.title} className={styles.productImage} loading="lazy" />
              <p>{offer.subtitle}</p>
              <Button variant="ghost" onClick={onStartShopping}>عرض العرض</Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductDetailsScreen({
  product,
  isFavorite,
  onBack,
  onCheckout,
  onToggleFavorite,
}: {
  product: Product;
  isFavorite: boolean;
  onBack: () => void;
  onCheckout: (product: Product, size: string, color: string) => void;
  onToggleFavorite: (productId: string) => Promise<void>;
}) {
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("#f5c07e");
  const discount = getReviewDiscount(product.reviewCount);

  return (
    <div className={styles.screen}>
      <section className={styles.detailHeader}>
        <button type="button" className={styles.backButton} onClick={onBack}>‹</button>
        <div>
          <p className={styles.sectionTag}>تفاصيل المنتج</p>
          <h2>{product.titleAr}</h2>
          <p className={styles.sectionHint}>{product.price}</p>
        </div>
      </section>

      <section className={styles.productDetailCard}>
        <div className={styles.productPreview}>
          <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productPreviewImage} loading="lazy" />
        </div>
        <div className={styles.productDetailInfo}>
          <div className={styles.productMeta}>
            <span>⭐ {product.averageRating.toFixed(1)}</span>
            <span>{product.reviewCount} تقييم</span>
            <span>{discount > 0 ? `خصم ${discount}%` : "بدون خصم"}</span>
          </div>

          <div className={styles.optionGroup}>
            <p className={styles.sectionTag}>اللون</p>
            <div className={styles.colorRow}>
              {['#f5c07e', '#c87a4d', '#4d5fa8', '#a84d7f', '#2f3a2c'].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    selectedColor === color ? styles.colorSwatchActive : styles.colorSwatch
                  }
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className={styles.optionGroup}>
            <p className={styles.sectionTag}>المقاس</p>
            <div className={styles.sizeRow}>
              {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={selectedSize === size ? styles.sizeButtonActive : styles.sizeButton}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <p className={styles.sectionSubtext}>
            فستان سهرة أنيق مصنوع من قماش عالي الجودة للمناسبات الخاصة.
          </p>

          <div className={styles.productDetailActions}>
            <Button variant="primary" onClick={() => onCheckout(product, selectedSize, selectedColor)}>أضف إلى السلة</Button>
            <Button variant="ghost" onClick={() => onCheckout(product, selectedSize, selectedColor)}>شراء الآن</Button>
            <button type="button" className={styles.secondaryButton} onClick={() => void onToggleFavorite(product.id)}>
              {isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckoutScreen({
  product,
  profile,
  defaultAddress,
  onBack,
  onConfirm,
}: {
  product: Product;
  profile: CustomerProfile;
  defaultAddress: CustomerAddress | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>‹</button>
        <div>
          <p className={styles.sectionTag}>إتمام الطلب</p>
          <h2>الدفع والشحن</h2>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactCard}>
          <span className={styles.contactTag}>المنتج المختار</span>
          <h3>{product.titleAr}</h3>
          <p>{product.detail}</p>
          <div className={styles.contactActions}>
            <span className={styles.contactButton}>{product.price}</span>
            <span className={styles.contactButton}>التوصيل خلال 48 ساعة</span>
          </div>
        </div>

        <form className={styles.contactForm}>
          <label>
            <span>الاسم الكامل</span>
            <input type="text" value={profile.fullName} className={styles.contactField} readOnly />
          </label>
          <label>
            <span>العنوان</span>
            <input
              type="text"
              value={defaultAddress ? `${defaultAddress.city} - ${defaultAddress.line1}` : "لا يوجد عنوان افتراضي"}
              className={styles.contactField}
              readOnly
            />
          </label>
          <label>
            <span>طريقة الدفع</span>
            <input type="text" value="PayPal" className={styles.contactField} readOnly />
          </label>
          <button type="button" className={styles.primaryButton} onClick={onConfirm}>تأكيد الطلب</button>
        </form>
      </section>
    </div>
  );
}

function OrderSuccessScreen({ product, onGoHome }: { product: Product; onGoHome: () => void }) {
  return (
    <div className={styles.screen}>
      <section className={styles.confirmationCard}>
        <span className={styles.confirmationBadge}>تمت العملية</span>
        <h2>تم تأكيد طلبك بنجاح</h2>
        <p>
          تم استلام طلب {product.titleAr} بقيمة {product.price}، وسيصلك تحديث الشحن قريبًا.
        </p>
        <div className={styles.profileActionButtons}>
          <button type="button" className={styles.secondaryButton} onClick={onGoHome}>العودة للرئيسية</button>
          <button type="button" className={styles.primaryButton} onClick={onGoHome}>متابعة التسوق</button>
        </div>
      </section>
    </div>
  );
}

function ReviewScreen({
  product,
  onBack,
  onSubmitReview,
}: {
  product: Product;
  onBack: () => void;
  onSubmitReview: (productId: string, rating: number, comment: string) => Promise<void>;
}) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [comment, setComment] = useState("");
  const discount = getReviewDiscount(product.reviewCount);
  const nextThreshold = product.reviewCount < 5 ? 5 : product.reviewCount < 10 ? 10 : product.reviewCount < 20 ? 20 : null;

  return (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={onBack}>‹</button>
        <div>
          <p className={styles.sectionTag}>تقييم المنتج</p>
          <h2>{product.titleAr}</h2>
          <p className={styles.sectionHint}>{product.price}</p>
        </div>
      </section>

      <section className={styles.reviewHeader}>
        <div>
          <span className={styles.reviewBadge}>{discount > 0 ? `خصم ${discount}%` : "بدون خصم"}</span>
          <p>{product.reviewCount} تقييم</p>
          <p>تقييم متوسط {product.averageRating.toFixed(1)}</p>
        </div>
        {nextThreshold && (
          <p className={styles.sectionHint}>أضف تقييمًا واحدًا أكثر للحصول على خصم {getReviewDiscount(nextThreshold - 1) + 5}%</p>
        )}
      </section>

      <div className={styles.ratingRow}>
        {Array.from({ length: 5 }).map((_, index) => (
          <button type="button" key={index} className={styles.starButton} onClick={() => setSelectedRating(index + 1)}>
            {index < selectedRating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <label className={styles.reviewField}>
        <span>اكتب تقييمك</span>
        <textarea
          placeholder="شارك تجربتك مع هذا المنتج..."
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>

      <div className={styles.reviewActions}>
        <button type="button" className={styles.secondaryButton}>إضافة صورة</button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={async () => {
            if (selectedRating === 0) {
              return;
            }

            await onSubmitReview(product.id, selectedRating, comment);
            setSubmitted(true);
          }}
        >
          إرسال التقييم
        </button>
      </div>

      {submitted && <p className={styles.sectionHint}>تم إرسال تقييمك بنجاح، شكرًا لمشاركتك.</p>}
    </div>
  );
}

function HelpScreen() {
  const [selectedFaq, setSelectedFaq] = useState<string | null>(null);
  const [isMessageSent, setIsMessageSent] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");

  const faqs = [
    { question: "كيف يمكنني تتبع طلبي؟", answer: "من صفحة حسابي ← تتبع الطلب، ستجد كل تحديثات الشحن لحظيًا." },
    { question: "ما هي طرق الدفع المتاحة؟", answer: "ندعم PayPal وApple Pay والبطاقات الائتمانية والتحويل المباشر." },
    { question: "ما سياسة الإرجاع والاستبدال؟", answer: "يمكنك طلب الإرجاع أو الاستبدال خلال 14 يومًا من تاريخ الاستلام." },
    { question: "كم تستغرق مدة التوصيل؟", answer: "عادة خلال 24-72 ساعة حسب المدينة وشركة الشحن." },
  ];

  const visibleFaqs = faqs.filter((item) => item.question.includes(helpQuery.trim()));

  return (
    <div className={styles.screen}>
      <section className={styles.helpHeader}>
        <div>
          <span className={styles.sectionTag}>مركز المساعدة</span>
          <h2>تحتاج مساعدة؟</h2>
        </div>
        <div className={styles.helpSearch}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="search"
            placeholder="ابحث عن إجابة..."
            aria-label="ابحث في المساعدة"
            className={styles.searchInput}
            value={helpQuery}
            onChange={(event) => setHelpQuery(event.target.value)}
          />
          <button type="button" className={styles.searchButton} aria-label="بحث" onClick={() => setSelectedFaq(visibleFaqs[0]?.question ?? null)}>
            ⌕
          </button>
        </div>
      </section>

      <div className={styles.faqList}>
        {visibleFaqs.map((item) => (
          <button
            key={item.question}
            type="button"
            className={styles.faqItem}
            onClick={() => setSelectedFaq(item.question === selectedFaq ? null : item.question)}
          >
            <span>{item.question}</span>
            <span className={styles.optionArrow}>›</span>
          </button>
        ))}

        {selectedFaq && (
          <Card
            title="الإجابة"
            subtitle={selectedFaq}
            className={styles.contactCard}
          >
            <p>{faqs.find((faq) => faq.question === selectedFaq)?.answer}</p>
          </Card>
        )}
      </div>

      <section className={styles.contactSection}>
        <div className={styles.contactCard}>
          <span className={styles.contactTag}>تواصل مباشر</span>
          <h3>لأي سؤال أو طلب، نحن هنا لخدمتك</h3>
          <p>أرسل لنا رسالة سريعة أو اختر طريقة الاتصال المفضلة لديك.</p>
          <div className={styles.contactActions}>
            <button type="button" className={styles.contactButton} onClick={() => setSelectedFaq("ما هي طرق الدفع المتاحة؟")}>واتساب</button>
            <button type="button" className={styles.contactButton} onClick={() => setSelectedFaq("كيف يمكنني تتبع طلبي؟")}>مكالمة</button>
          </div>
        </div>

        <form className={styles.contactForm}>
          <label>
            <span>الاسم</span>
            <input type="text" placeholder="الاسم الكامل" className={styles.contactField} />
          </label>
          <label>
            <span>البريد الإلكتروني</span>
            <input type="email" placeholder="name@example.com" className={styles.contactField} />
          </label>
          <label>
            <span>رسالتك</span>
            <textarea placeholder="اكتب طلبك أو سؤالك هنا" className={styles.contactField} rows={4} />
          </label>
          <button type="button" className={styles.primaryButton} onClick={() => setIsMessageSent(true)}>إرسال الرسالة</button>
        </form>

        {isMessageSent && <p className={styles.sectionHint}>تم استلام رسالتك وسنتواصل معك قريبًا.</p>}
      </section>
    </div>
  );
}

type ProfileView = "main" | "orderTracking" | "editAddress" | "settings" | "payments" | "personal" | "saved" | "logout";

function ProfileScreen({
  profile,
  addresses,
  favoriteProducts,
  orders,
  notifications,
  onUpdateProfile,
  onAddAddress,
  onLogout,
}: {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  favoriteProducts: Product[];
  orders: CustomerOrder[];
  notifications: CustomerNotification[];
  onUpdateProfile: (patch: Partial<Omit<CustomerProfile, "id">>) => Promise<void>;
  onAddAddress: (input: Omit<CustomerAddress, "id">) => Promise<void>;
  onLogout: () => void;
}) {
  const [view, setView] = useState<ProfileView>("main");
  const [profileNotice, setProfileNotice] = useState("");
  const [nameInput, setNameInput] = useState(profile.fullName);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [phoneInput, setPhoneInput] = useState(profile.phone);

  useEffect(() => {
    setNameInput(profile.fullName);
    setEmailInput(profile.email);
    setPhoneInput(profile.phone);
  }, [profile]);

  const accountItems = [
    { id: "orders", icon: "📦", label: "طلباتي", action: () => setView("orderTracking") },
    { id: "track", icon: "🚚", label: "تتبع الطلب", action: () => setView("orderTracking") },
    { id: "addresses", icon: "📍", label: "عناويني", action: () => setView("editAddress") },
    { id: "payments", icon: "💳", label: "طرق الدفع", action: () => setView("payments") },
    { id: "personal", icon: "👤", label: "معلوماتي الشخصية", action: () => setView("personal") },
    { id: "favorites", icon: "❤️", label: "المفضلة", action: () => setView("saved") },
    { id: "settings", icon: "⚙️", label: "إعدادات الحساب", action: () => setView("settings") },
    { id: "logout", icon: "🚪", label: "تسجيل الخروج", action: () => setView("logout") },
  ];

  const renderMainView = () => (
    <>
      <section className={styles.profileHeaderTop}>
        <button type="button" className={styles.iconButton} aria-label="الإعدادات" onClick={() => setView("settings")}>
          ⚙️
        </button>
        <button type="button" className={styles.iconButton} aria-label="معلومات آمنة" onClick={() => setView("personal")}>
          🔒
        </button>
      </section>

      <section className={styles.profileHero}>
        <div className={styles.profileAvatar}>BA</div>
        <div>
          <p className={styles.profileName}>{profile.fullName}</p>
          <p className={styles.profileEmail}>{profile.email}</p>
          <span className={styles.profileStatus}>{profile.statusLabel}</span>
        </div>
      </section>

      <div className={styles.profileOptions}>
        {accountItems.map((item) => (
          <button key={item.id} type="button" className={styles.profileOption} onClick={item.action}>
            <span className={styles.optionIcon}>{item.icon}</span>
            <span>{item.label}</span>
            <span className={styles.optionArrow}>›</span>
          </button>
        ))}
      </div>
    </>
  );

  const renderOrderTracking = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>الإشعارات</p>
          <h2>تتبع الطلب</h2>
        </div>
      </section>

      <div className={styles.trackingList}>
        {notifications.map((item) => (
          <article key={item.id} className={styles.notificationCard}>
            <span className={styles.notificationIcon}>🔔</span>
            <div>
              <p>{item.title}</p>
              <span>{item.detail}</span>
            </div>
          </article>
        ))}
      </div>

      <section className={styles.trackingCard}>
        {orders[0] ? (
          <>
        <div className={styles.trackingHeader}>
          <div>
            <p className={styles.sectionTag}>{orders[0].id}</p>
            <h2>{orders[0].status === "new" ? "قيد المراجعة" : orders[0].status === "preparing" ? "جاري التجهيز" : orders[0].status === "shipped" ? "تم الشحن" : orders[0].status === "delivered" ? "تم التسليم" : "ملغي"}</h2>
            <p className={styles.sectionHint}>تاريخ الطلب {orders[0].createdAt}</p>
          </div>
          <div className={styles.statusBadge}>{orders[0].status}</div>
        </div>

        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <span className={styles.timelineDot}>●</span>
            <div>
              <p>تم تأكيد الطلب</p>
              <span>24 مايو • 10:30 ص</span>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineDot}>●</span>
            <div>
              <p>جاري التجهيز</p>
              <span>24 مايو • 02:15 م</span>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineDot}>●</span>
            <div>
              <p>تم الشحن</p>
              <span>25 مايو • 04:40 م</span>
            </div>
          </div>
          <div className={styles.timelineItem}>
            <span className={styles.timelineDot}>○</span>
            <div>
              <p>في طريقه إليك</p>
              <span>الوقت المتوقع 27 مايو</span>
            </div>
          </div>
        </div>

        <div className={styles.mapCard}>
          <img src={logisticsImages.shippingMap} alt="خريطة مسار الشحن" className={styles.mapPreviewImage} loading="lazy" />
        </div>

        <Button variant="primary" onClick={() => setView("orderTracking")}>عرض التفاصيل</Button>
          </>
        ) : (
          <p className={styles.sectionHint}>لا توجد طلبات حتى الآن.</p>
        )}
      </section>
    </div>
  );

  const renderAddressEdit = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>اختر عنوان التوصيل</p>
          <h2>تعديل العنوان</h2>
        </div>
      </section>

      <section className={styles.addressMapCard}>
        <img src={logisticsImages.addressMap} alt="خريطة عنوان التوصيل" className={styles.mapPreviewImage} loading="lazy" />
        <button type="button" className={styles.addressEditButton} onClick={() => setView("editAddress")}>تعديل</button>
      </section>

      <div className={styles.addressRow}>
        <div>
          <p className={styles.sectionTag}>{addresses[0]?.label ?? "بدون عنوان"}</p>
          <p>{addresses[0] ? `${addresses[0].line1}، ${addresses[0].city}` : "أضف عنوانًا جديدًا"}</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={() => setView("editAddress")}>تعديل</button>
      </div>

      <button
        type="button"
        className={styles.primaryButton}
        onClick={async () => {
          await onAddAddress({
            label: "عنوان جديد",
            line1: "شارع جديد",
            city: "القدس",
            isDefault: false,
          });
          setProfileNotice("تمت إضافة عنوان جديد");
        }}
      >
        إضافة عنوان جديد
      </button>
      <button type="button" className={styles.primaryButton} onClick={() => setView("main")}>تأكيد العنوان</button>
      {profileNotice && <p className={styles.sectionHint}>{profileNotice}</p>}
    </div>
  );

  const renderSettingsView = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>الإعدادات</p>
          <h2>ضبط حساب <BrandName /></h2>
        </div>
      </section>

      <div className={styles.settingsList}>
        {[
          { label: "اللغة", value: "العربية", action: () => setProfileNotice("تم ضبط اللغة العربية كلغة افتراضية") },
          { label: "العملة", value: "ILS", action: () => setProfileNotice("تم تثبيت العملة على ILS") },
          { label: "الإشعارات", value: "تشغيل", action: () => setProfileNotice("الإشعارات مفعّلة") },
          { label: "الخصوصية والضمان", value: "عرض", action: () => setView("personal") },
          { label: "طرق الدفع", value: "Visa / Mada", action: () => setView("payments") },
          { label: "الشروط", value: "عرض", action: () => setProfileNotice("تم فتح الشروط والأحكام") },
          { label: "مركز المساعدة", value: "فتح", action: () => setView("main") },
          { label: "عن BAMORA", value: "عرض", action: () => setProfileNotice("BAMORA منصة تسوق فاخرة بتجربة مخصصة") },
        ].map((item) => (
          <button key={item.label} type="button" className={styles.settingsItem} onClick={item.action}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </button>
        ))}
      </div>

      {profileNotice && <p className={styles.sectionHint}>{profileNotice}</p>}
    </div>
  );

  const renderPaymentsView = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>إدارة الدفع</p>
          <h2>طرق الدفع</h2>
        </div>
      </section>

      <div className={styles.settingsList}>
        {[
          { label: "Visa المنتهية بـ 2143", value: "افتراضية" },
          { label: "Mastercard المنتهية بـ 8870", value: "ثانوية" },
          { label: "PayPal", value: "مفعّل" },
          { label: "Apple Pay", value: "جاهز" },
        ].map((item) => (
          <button key={item.label} type="button" className={styles.settingsItem} onClick={() => setProfileNotice(`تم اختيار ${item.label}`)}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </button>
        ))}
      </div>

      <div className={styles.profileActionButtons}>
        <button type="button" className={styles.secondaryButton} onClick={() => setProfileNotice("تم فتح نموذج إضافة بطاقة جديدة")}>إضافة بطاقة جديدة</button>
        <button type="button" className={styles.primaryButton} onClick={() => setProfileNotice("تم حفظ تفضيلات الدفع")}>حفظ التفضيلات</button>
      </div>

      {profileNotice && <p className={styles.sectionHint}>{profileNotice}</p>}
    </div>
  );

  const renderPersonalInfoView = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>البيانات الشخصية</p>
          <h2>معلوماتي الشخصية</h2>
        </div>
      </section>

      <form className={styles.contactForm}>
        <label>
          <span>الاسم الكامل</span>
          <input type="text" value={nameInput} className={styles.contactField} onChange={(event) => setNameInput(event.target.value)} />
        </label>
        <label>
          <span>البريد الإلكتروني</span>
          <input type="email" value={emailInput} className={styles.contactField} onChange={(event) => setEmailInput(event.target.value)} />
        </label>
        <label>
          <span>رقم الهاتف</span>
          <input type="tel" value={phoneInput} className={styles.contactField} onChange={(event) => setPhoneInput(event.target.value)} />
        </label>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={async () => {
            await onUpdateProfile({ fullName: nameInput, email: emailInput, phone: phoneInput });
            setProfileNotice("تم حفظ المعلومات الشخصية");
          }}
        >
          تحديث المعلومات
        </button>
      </form>

      {profileNotice && <p className={styles.sectionHint}>{profileNotice}</p>}
    </div>
  );

  const renderSavedView = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>قائمة محفوظة</p>
          <h2>المفضلة من الحساب</h2>
        </div>
      </section>

      <div className={styles.productGrid}>
        {favoriteProducts.slice(0, 3).map((product) => (
          <Card key={`saved-${product.id}`} title={product.titleAr} subtitle={product.price} className={styles.productCard}>
            <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
            <p>{product.detail}</p>
          </Card>
        ))}
      </div>

      <button type="button" className={styles.primaryButton} onClick={() => setView("main")}>العودة للحساب</button>
    </div>
  );

  const renderLogoutView = () => (
    <div className={styles.screen}>
      <section className={styles.titleRow}>
        <button type="button" className={styles.backButton} onClick={() => setView("main")}>‹</button>
        <div>
          <p className={styles.sectionTag}>الأمان</p>
          <h2>تسجيل الخروج</h2>
        </div>
      </section>

      <section className={styles.confirmationCard}>
        <span className={styles.confirmationBadge}>تأكيد</span>
        <p>هل أنت متأكد أنك تريد تسجيل الخروج من حسابك الآن؟</p>
        <div className={styles.profileActionButtons}>
          <button type="button" className={styles.secondaryButton} onClick={() => setView("main")}>إلغاء</button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              onLogout();
              setView("main");
            }}
          >
            تسجيل الخروج الآن
          </button>
        </div>
      </section>
    </div>
  );

  return (
    <div className={styles.screen}>
      {view === "main" && renderMainView()}
      {view === "orderTracking" && renderOrderTracking()}
      {view === "editAddress" && renderAddressEdit()}
      {view === "settings" && renderSettingsView()}
      {view === "payments" && renderPaymentsView()}
      {view === "personal" && renderPersonalInfoView()}
      {view === "saved" && renderSavedView()}
      {view === "logout" && renderLogoutView()}
    </div>
  );
}

function MirrorExperience({
  isOpen,
  selectedCategory,
  onSelectCategory,
  onClose,
  onOpenProduct,
}: {
  isOpen: boolean;
  selectedCategory: MirrorCategory;
  onSelectCategory: (category: MirrorCategory) => void;
  onClose: () => void;
  onOpenProduct: (product: Product) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.mirrorOverlay} role="dialog" aria-modal="true" aria-label="مرآة BAMORA">
      <button type="button" className={styles.mirrorBackdrop} onClick={onClose} aria-label="إغلاق المرآة" />

      <section className={styles.mirrorPanel}>
        <div className={styles.mirrorPanelHeader}>
          <div>
            <p className={styles.sectionTag}>Mirror / Virtual Try-On</p>
            <h3>جرّب الإطلالة قبل الشراء</h3>
          </div>
          <button type="button" className={styles.mirrorClose} onClick={onClose}>إغلاق</button>
        </div>

        <div className={styles.mirrorCategoryRow}>
          {(Object.keys(mirrorCollections) as MirrorCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              className={
                category === selectedCategory
                  ? `${styles.mirrorCategoryChip} ${styles.mirrorCategoryChipActive}`
                  : styles.mirrorCategoryChip
              }
              onClick={() => onSelectCategory(category)}
            >
              {mirrorCategoryLabels[category]}
            </button>
          ))}
        </div>

        <div className={styles.mirrorProductGrid}>
          {mirrorCollections[selectedCategory].map((product) => (
            <article key={product.id} className={styles.mirrorProductCard}>
              <img src={getProductImage(product.id)} alt={product.titleAr} className={styles.productImage} loading="lazy" />
              <h4>{product.titleAr}</h4>
              <p>{product.detail}</p>
              <div className={styles.mirrorProductMeta}>
                <span>{product.price}</span>
                <span>⭐ {product.averageRating.toFixed(1)}</span>
              </div>
              <button type="button" className={styles.primaryButton} onClick={() => onOpenProduct(product)}>
                عرض في المرآة
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CustomerAuthScreen({
  mode,
  fullName,
  email,
  password,
  loading,
  error,
  onModeChange,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  mode: "login" | "signup";
  fullName: string;
  email: string;
  password: string;
  loading: boolean;
  error: string;
  onModeChange: (mode: "login" | "signup") => void;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className={styles.screen}>
      <section className={styles.discountHero}>
        <div>
          <span className={styles.sectionTag}>بوابة العميل</span>
          <h2>{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h2>
          <p>أكمل بياناتك للوصول إلى المفضلة، السلة، الطلبات، والدفع.</p>
        </div>
      </section>

      <section className={styles.contactSection}>
        <form className={styles.contactForm}>
          {mode === "signup" && (
            <label>
              <span>الاسم الكامل</span>
              <input
                type="text"
                className={styles.contactField}
                value={fullName}
                onChange={(event) => onFullNameChange(event.target.value)}
              />
            </label>
          )}
          <label>
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              className={styles.contactField}
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </label>
          <label>
            <span>كلمة المرور</span>
            <input
              type="password"
              className={styles.contactField}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </label>

          <button type="button" className={styles.primaryButton} disabled={loading} onClick={() => void onSubmit()}>
            {loading ? "جاري المعالجة..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
          </button>

          {error && <p className={styles.sectionHint}>{error}</p>}

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب بالفعل؟ تسجيل الدخول"}
          </button>
        </form>
      </section>
    </div>
  );
}

type CustomerAppProps = {
  language?: AppLanguage;
  onLanguageChange?: (language: AppLanguage) => void;
};

export function CustomerApp({ language: languageProp, onLanguageChange }: CustomerAppProps = {}) {
  const customerRepository = useMemo(() => createCustomerRepository(), []);
  const [language, setLanguage] = useState<AppLanguage>(() => languageProp ?? getSavedLanguage());
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const [categories, setCategories] = useState<DynamicCategory[]>(() => getDefaultCategories());
  const [page, setPage] = useState<PageKey>("home");
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [completedOrderProduct, setCompletedOrderProduct] = useState<Product | null>(null);
  const [isMirrorOpen, setIsMirrorOpen] = useState(false);
  const [mirrorCategory, setMirrorCategory] = useState<MirrorCategory>("women");
  const [currentRole, setCurrentRoleState] = useState<"customer" | "merchant" | "super-admin" | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [authFullName, setAuthFullName] = useState("عميل BAMORA");
  const [authEmail, setAuthEmail] = useState("customer@bamora.com");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [storeProducts, setStoreProducts] = useState<StorefrontProduct[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [dataError, setDataError] = useState("");

  const hydrateCustomerData = async () => {
    const dashboard = await customerRepository.getDashboard();
    setProfile(dashboard.profile);
    setAddresses(dashboard.addresses);
    setStoreProducts(dashboard.products);
    setFavoriteIds(dashboard.favoriteIds);
    setOrders(dashboard.orders);
    setNotifications(dashboard.notifications);
    setDataError("");
  };

  useEffect(() => {
    let isMounted = true;
    const storedRole = getCurrentRole();
    setCurrentRoleState(storedRole);
    setIsAuthenticated(storedRole === "customer");

    resolveDynamicCategories().then((resolved) => {
      if (!isMounted || resolved.length === 0) {
        return;
      }

      setCategories(resolved);
    });

    hydrateCustomerData().catch((error) => {
      if (!isMounted) {
        return;
      }

      setDataError(error instanceof Error ? error.message : "تعذر تحميل بيانات العميل");
    });

    return () => {
      isMounted = false;
    };
  }, [customerRepository]);

  useEffect(() => {
    if (!languageProp) {
      return;
    }

    setLanguage(languageProp);
  }, [languageProp]);

  useEffect(() => {
    if (languageProp || !profile?.locale) {
      return;
    }

    setLanguage(profile.locale);
  }, [languageProp, profile?.locale]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    applyRuntimeTranslations(document.body, language);
  }, [language, page, reviewProduct, selectedProduct, checkoutProduct, completedOrderProduct]);

  const featuredProductsView = storeProducts.filter((product) => product.featured).map(mapStorefrontProduct);
  const topSellingProductsView = storeProducts.filter((product) => product.topSelling).map(mapStorefrontProduct);
  const favoritesProductsView = storeProducts
    .filter((product) => favoriteIds.includes(product.id))
    .map(mapStorefrontProduct);
  const defaultProfile: CustomerProfile =
    profile ??
    {
      id: "CUS-1",
      fullName: "عميل BAMORA",
      email: "customer@bamora.com",
      phone: "+972 59-000-0000",
      statusLabel: "عضو ذهبي",
      locale: "ar",
    };
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;

  const handleSelect = (id: string) => {
    setSelectedProduct(null);
    setReviewProduct(null);
    setCheckoutProduct(null);
    setCompletedOrderProduct(null);
    setIsMirrorOpen(false);
    setPage(id as PageKey);
  };

  const handleRateProduct = (product: Product) => setReviewProduct(product);
  const closeReview = () => setReviewProduct(null);
  const handleSelectProduct = (product: Product) => setSelectedProduct(product);
  const closeProductDetails = () => setSelectedProduct(null);

  const startCheckout = async (product: Product, size: string, color: string) => {
    await customerRepository.addToCart({ productId: product.id, quantity: 1, size, color });
    setSelectedProduct(null);
    setReviewProduct(null);
    setCheckoutProduct(product);
    await hydrateCustomerData();
  };

  const closeCheckout = () => setCheckoutProduct(null);

  const confirmOrder = async () => {
    if (!checkoutProduct) {
      return;
    }

    await customerRepository.checkout();
    setCompletedOrderProduct(checkoutProduct);
    setCheckoutProduct(null);
    await hydrateCustomerData();
  };

  const finishOrder = () => {
    setCompletedOrderProduct(null);
    setPage("home");
  };

  const openMirror = () => {
    setIsMirrorOpen(true);
  };

  const closeMirror = () => {
    setIsMirrorOpen(false);
  };

  const openProductFromMirror = (product: Product) => {
    setReviewProduct(null);
    setSelectedProduct(product);
    closeMirror();
  };

  const submitReview = async (productId: string, rating: number, comment: string) => {
    await customerRepository.submitReview({ productId, rating, comment });
    await hydrateCustomerData();
  };

  const toggleFavorite = async (productId: string) => {
    await customerRepository.toggleFavorite(productId);
    await hydrateCustomerData();
  };

  const handleAuthSubmit = async () => {
    setAuthError("");
    if (!authEmail || !authPassword || (authMode === "signup" && !authFullName)) {
      setAuthError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        await customerRepository.signup({
          fullName: authFullName,
          email: authEmail,
          password: authPassword,
        });
      } else {
        await customerRepository.login({ email: authEmail, password: authPassword });
      }

      setCurrentRole("customer");
      setCurrentRoleState("customer");
      setIsAuthenticated(true);
      await hydrateCustomerData();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "تعذر إتمام العملية");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearRoleSession();
    setCurrentRoleState(null);
    setIsAuthenticated(false);
    setPage("home");
    setSelectedProduct(null);
    setReviewProduct(null);
    setCheckoutProduct(null);
    setCompletedOrderProduct(null);
  };

  const handleLanguageSelection = async (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
    persistLanguage(nextLanguage);
    onLanguageChange?.(nextLanguage);

    if (profile) {
      await customerRepository.updateProfile({ locale: nextLanguage });
      await hydrateCustomerData();
    }
  };

  return (
    <AppShell>
      <div className={styles.headerBar}>
        <div>
          <BamoraLogo size="sm" />
          <BrandName />
          <p className={styles.brandTag}>وجهتك للتسوق الفاخر.</p>
        </div>
        <div className={styles.languageSelector} data-no-translate="true">
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setLanguageMenuOpen((current) => !current)}
            aria-expanded={languageMenuOpen}
            aria-haspopup="menu"
          >
            {`اللغة: ${getLanguageLabel(language)}`}
          </button>
          {languageMenuOpen && (
            <div className={styles.languageMenu} role="menu" aria-label="Language selector">
              {(["ar", "en", "he"] as AppLanguage[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="menuitem"
                  className={item === language ? styles.languageMenuItemActive : styles.languageMenuItem}
                  onClick={() => void handleLanguageSelection(item)}
                >
                  {getLanguageLabel(item)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className={styles.container}>
        <div
          key={`${page}-${selectedProduct?.id ?? "none"}-${reviewProduct?.id ?? "none"}-${checkoutProduct?.id ?? "none"}-${completedOrderProduct?.id ?? "none"}`}
          className={styles.pageFade}
        >
        {currentRole && !hasRoleAccess(currentRole, "customer") ? (
          <section className={styles.confirmationCard}>
            <span className={styles.confirmationBadge}>صلاحية غير متاحة</span>
            <h2>هذه الواجهة مخصصة للعميل فقط</h2>
            <p>الدور الحالي: {currentRole}</p>
            <div className={styles.profileActionButtons}>
              <button type="button" className={styles.primaryButton} onClick={handleLogout}>تبديل الحساب</button>
            </div>
          </section>
        ) : !isAuthenticated ? (
          <CustomerAuthScreen
            mode={authMode}
            fullName={authFullName}
            email={authEmail}
            password={authPassword}
            loading={authLoading}
            error={authError}
            onModeChange={setAuthMode}
            onFullNameChange={setAuthFullName}
            onEmailChange={setAuthEmail}
            onPasswordChange={setAuthPassword}
            onSubmit={handleAuthSubmit}
          />
        ) : completedOrderProduct ? (
          <OrderSuccessScreen product={completedOrderProduct} onGoHome={finishOrder} />
        ) : checkoutProduct ? (
          <CheckoutScreen
            product={checkoutProduct}
            profile={defaultProfile}
            defaultAddress={defaultAddress}
            onBack={closeCheckout}
            onConfirm={() => void confirmOrder()}
          />
        ) : selectedProduct ? (
          <ProductDetailsScreen
            product={selectedProduct}
            isFavorite={favoriteIds.includes(selectedProduct.id)}
            onBack={closeProductDetails}
            onCheckout={(product, size, color) => void startCheckout(product, size, color)}
            onToggleFavorite={toggleFavorite}
          />
        ) : reviewProduct ? (
          <ReviewScreen product={reviewProduct} onBack={closeReview} onSubmitReview={submitReview} />
        ) : (
          <>
            {dataError && <p className={styles.sectionHint}>{dataError}</p>}
            {page === "home" && (
              <HomeScreen
                categories={categories}
                featured={featuredProductsView}
                onStartShopping={() => setPage("shop")}
                onOpenOffers={() => setPage("offers")}
              />
            )}
            {page === "shop" && (
              <ShopScreen
                categories={categories}
                featuredProducts={featuredProductsView}
                topSellingProducts={topSellingProductsView}
                onRate={handleRateProduct}
                onSelectProduct={handleSelectProduct}
                onOpenMirror={openMirror}
                onOpenOffers={() => setPage("offers")}
              />
            )}
            {page === "favorites" && (
              <FavoritesScreen
                products={favoritesProductsView}
                onRate={handleRateProduct}
                onSelectProduct={handleSelectProduct}
              />
            )}
            {page === "offers" && <OffersScreen onStartShopping={() => setPage("shop")} />}
            {page === "help" && <HelpScreen />}
            {page === "profile" && (
              <ProfileScreen
                profile={defaultProfile}
                addresses={addresses}
                favoriteProducts={favoritesProductsView}
                orders={orders}
                notifications={notifications}
                onUpdateProfile={async (patch) => {
                  await customerRepository.updateProfile(patch);
                  await hydrateCustomerData();
                }}
                onAddAddress={async (input) => {
                  await customerRepository.upsertAddress(input);
                  await hydrateCustomerData();
                }}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
        </div>
      </main>

      {isAuthenticated && (
        <>
          <button type="button" className={styles.mirrorLauncher} onClick={openMirror} aria-label="فتح المرآة">
            ✨ المرآة
          </button>

          <MirrorExperience
            isOpen={isMirrorOpen}
            selectedCategory={mirrorCategory}
            onSelectCategory={setMirrorCategory}
            onClose={closeMirror}
            onOpenProduct={openProductFromMirror}
          />

          <BottomNav
            items={navItems.map((item) => ({
              id: item.id,
              label: item.label,
              icon: item.icon,
              active: item.id === page,
            }))}
            onSelect={handleSelect}
          />
        </>
      )}
    </AppShell>
  );
}
