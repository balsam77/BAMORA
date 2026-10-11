import {
  BamoraLogo,
  Button,
  Card,
  categoryTiles,
  featuredProducts,
  homepageCards,
} from "@bamora/ui";
import { AppShell } from "@/components/app/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { BrandName } from "@/components/brand/BrandName";
import styles from "./HomeView.module.css";

export function HomeView() {
  return (
    <AppShell>
      <section className={styles.heroSection}>
        <div className={styles.heroBadge}><BrandName /></div>
        <div className={styles.heroPanel}>
          <div className={styles.heroHeader}>
            <BamoraLogo size="lg" />
            <p className={styles.heroTitle}>
              <BrandName /> — تسوق فاخر ومباشر للزبون.
            </p>
          </div>

          <p className={styles.heroText}>
            اكتشف تشكيلات مميزة وأناقة متجددة مع تجربة تسوق سهلة وسريعة.
          </p>

          <div className={styles.heroActions}>
            <Button variant="primary">ابدأ التسوق</Button>
            <Button variant="ghost">العروض</Button>
          </div>
        </div>
      </section>

      <section className={styles.quickPickSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>ابدأ سريعًا</p>
            <h2>ما الذي تبحث عنه اليوم؟</h2>
          </div>
          <span className={styles.sectionSubtext}>
            اختر الإطلالة المثالية وابدأ تجربة التسوق.
          </span>
        </div>

        <div className={styles.quickPickGrid}>
          {homepageCards.map((card) => (
            <button key={card.id} type="button" className={styles.quickCard}>
              <span className={styles.quickTitleAr}>
                {card.titleAr}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.categoriesSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>الأقسام</p>
            <h2>تشكيلات منتقاة</h2>
          </div>
          <span className={styles.sectionSubtext}>
            خيارات أنيقة لقطع مميزة في كل مناسبة.
          </span>
        </div>

        <div className={styles.categoryGrid}>
          {categoryTiles.map((category) => (
            <Card
              key={category.id}
              title={category.titleAr}
              subtitle={category.titleAr}
              className={styles.categoryCard}
            >
              <p className={styles.categoryDescription}>
                استكشف أفضل الخيارات في قسم {category.titleAr}.
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>تشكيلة حصرية</p>
            <h2>أحدث الإضافات</h2>
          </div>
          <span className={styles.sectionSubtext}>
            قطع فاخرة جديدة لتجديد خزانة ملابسك.
          </span>
        </div>

        <div className={styles.featuredGrid}>
          {featuredProducts.map((product) => (
            <Card
              key={product.id}
              title={product.titleAr}
              subtitle={product.price}
              className={styles.productCard}
            >
              <p className={styles.productDetail}>{product.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <BottomNav
        items={[
          { id: "home", label: "الرئيسية", icon: "🏠", active: true },
          { id: "shop", label: "تسوق", icon: "🛍️" },
          { id: "favorites", label: "المفضلة", icon: "❤️" },
          { id: "offers", label: "العروض", icon: "🎁" },
          { id: "help", label: "مساعدة", icon: "❓" },
          { id: "profile", label: "حسابي", icon: "👤" },
        ]}
      />
    </AppShell>
  );
}
