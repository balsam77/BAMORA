"use client";

import { useCallback, useEffect, useState } from "react";
import { setCurrentRole, type AppRole } from "@bamora/platform";
import { getDailyMessage } from "@bamora/ui";
import { CustomerApp } from "@/components/app/CustomerApp";
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
import styles from "./OpeningExperience.module.css";

type Stage = "loading" | "portal" | "splash" | "advice" | "account" | "selection" | "mirror" | "department" | "checkout" | "success" | "home";

const departmentProductsByCategory: Record<string, Array<{ title: string; price: string }>> = {
  women: [
    { title: "فستان ساتان مخملي", price: "₪549 ILS" },
    { title: "فستان مسائي بتطريز ذهبي", price: "₪399 ILS" },
    { title: "فستان صيفي مزهر", price: "₪275 ILS" },
    { title: "فستان دانتيل مميز", price: "₪610 ILS" },
  ],
  men: [
    { title: "بدلة إيطالية كحلية", price: "₪1,200 ILS" },
    { title: "بليزر صوفي رمادي", price: "₪850 ILS" },
    { title: "توكسيدو سهرة مودرن", price: "₪1,450 ILS" },
    { title: "معطف طويل بلون الجمل", price: "₪1,100 ILS" },
  ],
  kids: [
    { title: "فستان صغير نجمي", price: "₪220 ILS" },
    { title: "بدلة صغيرة أنيقة", price: "₪320 ILS" },
    { title: "بدلة لعب ملونة", price: "₪180 ILS" },
    { title: "حذاء رياضي للأطفال", price: "₪140 ILS" },
  ],
  kitchen: [
    { title: "طقم مئزر الشيف", price: "₪120 ILS" },
    { title: "أواني طبخ فاخرة", price: "₪430 ILS" },
    { title: "طقم سكاكين ممتاز", price: "₪260 ILS" },
    { title: "صينية تقديم مع حواف ذهبية", price: "₪310 ILS" },
  ],
  bath: [
    { title: "طقم مناشف سبا", price: "₪180 ILS" },
    { title: "مجموعة زيوت حمام", price: "₪215 ILS" },
    { title: "صندوق هدايا استحمام", price: "₪145 ILS" },
    { title: "روب حمام فاخر", price: "₪340 ILS" },
  ],
  salon: [
    { title: "مجفف شعر احترافي", price: "₪520 ILS" },
    { title: "طقم أدوات تصفيف", price: "₪370 ILS" },
    { title: "طقم مرايا صالون", price: "₪260 ILS" },
    { title: "سيروم علاج الشعر", price: "₪190 ILS" },
  ],
};

function buildCategoryProducts(categoryLabel: string) {
  return [
    { title: `${categoryLabel} - قطعة أساسية`, price: "₪249 ILS" },
    { title: `${categoryLabel} - إصدار مميز`, price: "₪389 ILS" },
    { title: `${categoryLabel} - تصميم فاخر`, price: "₪569 ILS" },
    { title: `${categoryLabel} - اختيار الموسم`, price: "₪719 ILS" },
  ];
}

function getCategoryProducts(categoryId: string, categoryLabel: string) {
  return departmentProductsByCategory[categoryId] ?? buildCategoryProducts(categoryLabel);
}

const departments = [
  "وصل حديثًا",
  "بدل وتفصيل",
  "جاكيتات ومعاطف",
  "قمصان",
  "أحذية",
  "إكسسوارات",
  "عناية",
  "ماركات",
] as const;

const storageKey = "bamoraOnboardingComplete";

export function OpeningExperience() {
  const [language, setLanguage] = useState<AppLanguage>(() => getSavedLanguage());
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [categories, setCategories] = useState<DynamicCategory[]>(() => getDefaultCategories());
  const [stage, setStage] = useState<Stage>("loading");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("paypal");
  const dailyMessage = getDailyMessage();
  const localizedDailyMessage =
    language === "en"
      ? dailyMessage.en
      : language === "he"
        ? dailyMessage.en
        : dailyMessage.ar;

  const openRoleApp = useCallback((role: Exclude<AppRole, "customer">) => {
    const url = new URL(window.location.href);
    const currentPort = Number(url.port || "0");
    let targetPort = role === "merchant" ? "3001" : "3002";

    if (currentPort > 0 && currentPort !== 3000) {
      targetPort = role === "merchant" ? String(currentPort + 1) : String(currentPort + 2);
    }

    url.port = targetPort;
    url.pathname = "/";
    url.search = "demo=1";
    url.hash = "";

    window.location.href = url.toString();
  }, []);

  const enterRole = useCallback((role: AppRole) => {
    setCurrentRole(role);

    if (role === "customer") {
      setStage("splash");
      return;
    }

    openRoleApp(role);
  }, [openRoleApp]);

  useEffect(() => {
    setStage("portal");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    applyRuntimeTranslations(document.body, language);
  }, [language, stage]);

  useEffect(() => {
    let isMounted = true;

    resolveDynamicCategories().then((resolved) => {
      if (!isMounted || resolved.length === 0) {
        return;
      }

      setCategories(resolved);
      setSelectedCategory((current) => current ?? resolved[0].id);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const advanceFromSplash = useCallback(() => {
    setStage("advice");
  }, []);

  const advanceToAccount = useCallback(() => {
    setStage("account");
  }, []);

  const advanceToSelection = useCallback(() => {
    setStage("selection");
  }, []);

  const openDepartment = useCallback((category: string) => {
    setSelectedCategory(category);
    setStage("department");
  }, []);

  const openMirror = useCallback(() => {
    if (!selectedCategory) {
      setSelectedCategory(categories[0]?.id ?? "women");
    }
    setStage("mirror");
  }, [categories, selectedCategory]);

  const openCheckout = useCallback(() => {
    if (!selectedCategory) {
      setSelectedCategory(categories[0]?.id ?? "women");
    }
    setStage("checkout");
  }, [categories, selectedCategory]);

  const confirmPayment = useCallback(() => {
    setStage("success");
  }, []);

  const paymentMethods = [
    { id: "paypal", label: "PayPal", subtitle: "دفع آمن عبر الإنترنت", icon: "PayPal" },
    { id: "applepay", label: "Apple Pay", subtitle: "دفع سريع عبر الجوال", icon: "Apple Pay" },
    { id: "pit", label: "بيت", subtitle: "تحويل مباشر للحساب", icon: "pit" },
    { id: "card", label: "دفع بالبطاقة", subtitle: "بطاقة ائتمان / خصم", icon: "Visa Mastercard" },
  ];

  const finishOnboarding = useCallback(() => {
    window.localStorage.setItem(storageKey, "true");
    setStage("home");
  }, []);

  const skipOnboarding = useCallback(() => {
    window.localStorage.setItem(storageKey, "true");
    setStage("home");
  }, []);

  const currentCategoryId = selectedCategory ?? categories[0]?.id ?? "women";
  const currentCategoryLabel = categories.find((category) => category.id === currentCategoryId)?.titleAr ?? "القسم";
  const currentCategoryProducts = getCategoryProducts(currentCategoryId, currentCategoryLabel);

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  };

  if (stage === "home") {
    return <CustomerApp language={language} onLanguageChange={handleLanguageChange} />;
  }

  if (stage === "loading") {
    return <div className={styles.shell} />;
  }

  return (
    <div className={styles.shell} data-stage={stage}>
      {stage !== "portal" && (
        <button type="button" className={styles.persistentMirrorButton} onClick={openMirror}>
          ✨ المرآة
        </button>
      )}
      {(stage === "department" || stage === "checkout") && (
        <button type="button" className={styles.fixedCart} onClick={openCheckout}>
          🛒 السلة
        </button>
      )}
      {stage === "portal" && (
        <section className={styles.portal}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.portalCard}>
            <div className={styles.stackedBrand}>
              <span className={styles.letterB}>B</span>
              <BrandName className={styles.brandTitle} />
            </div>
            <p className={styles.portalLabel}>اختر نوع الحساب للدخول إلى منصة BAMORA</p>
            <div className={styles.portalGrid}>
              <button type="button" className={styles.portalOption} onClick={() => enterRole("customer")}>
                <span>🛍️</span>
                <strong>Customer</strong>
                <small>الدخول إلى تجربة العميل</small>
              </button>
              <button type="button" className={styles.portalOption} onClick={() => enterRole("merchant")}>
                <span>🏪</span>
                <strong>Merchant</strong>
                <small>إدارة المتجر والطلبات</small>
              </button>
              <button type="button" className={styles.portalOption} onClick={() => enterRole("super-admin")}>
                <span>🛡️</span>
                <strong>Super Admin</strong>
                <small>إدارة المنصة بالكامل</small>
              </button>
            </div>
          </div>
        </section>
      )}
      {stage === "splash" && (
        <button
          type="button"
          className={styles.splash}
          onClick={advanceFromSplash}
          aria-label="اضغط للمتابعة إلى BAMORA"
        >
          <span className={styles.glowLayer} aria-hidden="true" />
          <div className={styles.heroContent}>
            <div className={styles.stackedBrand}>
              <span className={styles.letterB}>B</span>
              <BrandName className={styles.brandTitle} />
            </div>
          </div>
        </button>
      )}

      {stage === "advice" && (
        <div className={styles.advice}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.dailyCard}>
            <p className={styles.adviceText} lang={language} dir={language === "en" ? "ltr" : "rtl"}>
              {localizedDailyMessage}
            </p>
            <button type="button" className={styles.ghostButton} onClick={advanceToAccount}>
              التالي
            </button>
          </div>
        </div>
      )}

      {stage === "account" && (
        <div className={styles.account}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.accountCard}>
            <div className={styles.accountTopRow}>
              <div className={styles.languageSelector} data-no-translate="true">
                <button
                  type="button"
                  className={styles.languageBar}
                  onClick={() => setLanguageMenuOpen((current) => !current)}
                  aria-expanded={languageMenuOpen}
                  aria-haspopup="menu"
                >
                  <span>{`اللغة: ${getLanguageLabel(language)}`}</span>
                </button>
                {languageMenuOpen && (
                  <div className={styles.languageMenu} role="menu" aria-label="Language selector">
                    {(["ar", "en", "he"] as AppLanguage[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="menuitem"
                        className={item === language ? styles.languageMenuItemActive : styles.languageMenuItem}
                        onClick={() => handleLanguageChange(item)}
                      >
                        {getLanguageLabel(item)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className={styles.skipButton} onClick={skipOnboarding}>
                تخطي
              </button>
            </div>
            <div className={styles.brandBlock}>
              <span className={styles.letterB}>B</span>
              <BrandName className={styles.brandTitle} />
            </div>
            <div className={styles.accountHeader}>
              <h1>إنشاء حساب</h1>
              <span>ابدأ تجربة تسوق أسهل مع <BrandName /></span>
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldSelect}>
                <span>الطول</span>
                <strong>اختر طولك</strong>
              </div>
              <div className={styles.fieldSelect}>
                <span>المقاس</span>
                <strong>اختر مقاسك</strong>
              </div>
              <div className={styles.fieldSelect}>
                <span>لون البشرة</span>
                <strong>اختر لون بشرتك</strong>
              </div>
              <div className={styles.fieldSelect}>
                <span>لون العيون</span>
                <strong>اختر لون عينيك</strong>
              </div>
            </div>
            <div className={styles.profileSection}>
              <p>صور الملف الشخصي</p>
              <div className={styles.photoPreviewRow}>
                <button type="button" className={styles.photoOption}>
                  <span className={styles.photoIcon}>👤</span>
                  <span>صورة وجهك</span>
                </button>
                <button type="button" className={styles.photoOption}>
                  <span className={styles.photoIcon}>🧍</span>
                  <span>صورة جسمك</span>
                </button>
              </div>
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.secondaryButton} onClick={skipOnboarding}>
                متابعة بدون حفظ
              </button>
              <button type="button" className={styles.ghostButton} onClick={advanceToSelection}>
                متابعة وحفظ المعلومات
              </button>
            </div>
          </div>
          <button type="button" className={styles.tryOnButton} onClick={openMirror}>
            تجربة الملابس
          </button>
        </div>
      )}

      {stage === "selection" && (
        <div className={styles.selection}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.selectionCard}>
            <div className={styles.heroContent}>
              <div className={styles.stackedBrand}>
                <span className={styles.letterB}>B</span>
                <BrandName className={styles.brandTitle} />
              </div>
            </div>
            <div className={styles.searchRow}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="كيف بقدر أساعدك اليوم؟"
                aria-label="ابحث عن استفسارك"
              />
            </div>
            <div className={styles.categoryGrid}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={styles.categoryItem}
                  type="button"
                  onClick={() => openDepartment(category.id)}
                >
                  <span className={styles.itemIcon}>{category.icon}</span>
                  <span>{category.titleAr}</span>
                </button>
              ))}
            </div>
            <div className={styles.inquiryCard}>
              <p>أي استفسار؟ تواصل مع فريق <BrandName /></p>
            </div>
          </div>
        </div>
      )}

      {stage === "mirror" && (
        <div className={styles.mirror}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.mirrorCard}>
            <div className={styles.mirrorHeader}>
              <div className={styles.stackedBrand}>
                <span className={styles.letterB}>B</span>
                <BrandName className={styles.brandTitle} />
              </div>
              <span className={styles.mirrorBadge}>3D MIRROR</span>
            </div>
            <div className={styles.mirrorPreview}>
              <div className={styles.mirrorScene}>
                <div className={styles.mirrorFigure}>👤</div>
                <div className={styles.mirrorOverlay}>
                  <span>اسحب لرؤية التجربة</span>
                  <span>↔️</span>
                </div>
              </div>
              <div className={styles.mirrorControls}>
                <button type="button" className={styles.secondaryButton} onClick={() => openDepartment(currentCategoryId)}>
                  العودة للقسم
                </button>
                <button type="button" className={styles.primaryButton} onClick={openCheckout}>
                  اكمل الدفع
                </button>
              </div>
            </div>
            <div className={styles.mirrorGrid}>
              {currentCategoryProducts.slice(0, 4).map((item) => (
                <button key={item.title} type="button" className={styles.mirrorItem}>
                  <span>{item.title}</span>
                  <strong>{item.price}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {stage === "department" && (
        <div className={styles.department}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.departmentCard}>
            <div className={styles.departmentHeader}>
              <div>
                <div className={styles.stackedBrand}>
                  <span className={styles.letterB}>B</span>
                  <BrandName className={styles.brandTitle} />
                </div>
                <div className={styles.departmentLabelGroup}>
                  <p className={styles.departmentTitle}>
                    {`قسم ${currentCategoryLabel}`}
                  </p>
                  <p className={styles.departmentTag}>{currentCategoryLabel}</p>
                </div>
              </div>
              <button type="button" className={styles.cartButton} onClick={openCheckout}>
                🛒 الدفع
              </button>
            </div>
            <div className={styles.departmentBody}>
              <aside className={styles.departmentNav}>
                {departments.map((item) => (
                  <button key={item} type="button" className={styles.departmentNavItem}>
                    {item}
                  </button>
                ))}
              </aside>
              <div className={styles.departmentProducts}>
                {currentCategoryProducts.map((item) => (
                  <button key={item.title} type="button" className={styles.productCard}>
                    <span className={styles.cardTitle}>{item.title}</span>
                    <span className={styles.cardPrice}>{item.price}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.departmentFooter}>
              <button type="button" className={styles.secondaryButton} onClick={advanceToSelection}>
                العودة للاختيار
              </button>
              <button type="button" className={styles.secondaryButton} onClick={openMirror}>
                عرض المرايا
              </button>
              <button type="button" className={styles.primaryButton} onClick={openCheckout}>
                السلة
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "checkout" && (
        <div className={styles.checkout}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.checkoutCard}>
            <div className={styles.searchRow}>
              <span className={styles.searchIcon}>🛒</span>
              <input
                className={styles.searchInput}
                type="text"
                value="ملخص الطلب"
                readOnly
              />
            </div>
            <div className={styles.checkoutList}>
              {currentCategoryProducts.map((item) => (
                <div key={item.title} className={styles.checkoutItem}>
                  <div className={styles.checkoutItemImage}>📦</div>
                  <div>
                    <p className={styles.checkoutItemTitle}>{item.title}</p>
                    <p className={styles.checkoutItemMeta}>المقاس: M • اللون: أسود</p>
                  </div>
                  <span className={styles.checkoutItemPrice}>{item.price}</span>
                </div>
              ))}
            </div>
            <div className={styles.paymentMethodSection}>
              <span className={styles.paymentMethodLabel}>اختر طريقة الدفع</span>
              <div className={styles.paymentMethodGrid}>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={
                      method.id === selectedPaymentMethod
                        ? `${styles.paymentMethodCard} ${styles.paymentMethodActive}`
                        : styles.paymentMethodCard
                    }
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <span className={styles.paymentMethodIcon}>{method.icon}</span>
                    <strong>{method.label}</strong>
                    <span>{method.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.checkoutTotalRow}>
              <span>الإجمالي:</span>
              <strong>₪2,108 ILS</strong>
            </div>
            <div className={styles.checkoutActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setStage("department")}>
                العودة للتعديل
              </button>
              <button type="button" className={styles.paymentButton} onClick={confirmPayment}>
                الدفع
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === "success" && (
        <div className={styles.success}>
          <div className={styles.background} aria-hidden="true" />
          <div className={styles.successCard}>
            <div className={styles.successBadge}>تمت بنجاح</div>
            <h1 className={styles.successTitle}>تم تأكيد الطلب</h1>
            <p className={styles.successDescription} lang="ar" dir="rtl">
              شكراً لاختيارك <BrandName />. تم تأكيد طلبك وسيتم تحضيره الآن للشحن.
            </p>
            <div className={styles.successSummary}>
              <div>
                <p>رقم الطلب</p>
                <strong>#BMR-9012</strong>
              </div>
              <div>
                <p>المبلغ المدفوع</p>
                <strong>₪2,108 ILS</strong>
              </div>
            </div>
            <div className={styles.successDetails}>
              <p>تفاصيل الطلب</p>
              <ul>
                {currentCategoryProducts.slice(0, 3).map((item) => (
                  <li key={item.title}>
                    <span>{item.title}</span>
                    <strong>{item.price}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.checkoutActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setStage("home")}>
                العودة إلى <BrandName />
              </button>
              <button type="button" className={styles.primaryButton} onClick={finishOnboarding}>
                اكمال التسوق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
