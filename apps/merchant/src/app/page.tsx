"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearRoleSession,
  createMerchantRepository,
  getCurrentRole,
  getPublicCategories,
  type CatalogCategory,
  type AppRole,
  MERCHANT_NAME_KEY,
  parseCsvField,
  ROLE_KEY,
  setCurrentRole,
  type MerchantOrder,
  type MerchantOrderStatus,
  type MerchantProduct,
  type MerchantProductInput,
  type MerchantStats,
} from "@bamora/platform";
import styles from "./page.module.css";

const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "1";

type MerchantTab = "overview" | "catalog" | "orders" | "promotions" | "notifications" | "analytics";

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  subCategory: string;
  price: string;
  quantity: string;
  sizes: string;
  colors: string;
  images: string;
};

const tabs: Array<{ id: MerchantTab; label: string; icon: string }> = [
  { id: "overview", label: "نظرة عامة", icon: "📊" },
  { id: "catalog", label: "إدارة المنتجات", icon: "🧾" },
  { id: "orders", label: "الطلبات", icon: "📦" },
  { id: "promotions", label: "العروض والكوبونات", icon: "🏷️" },
  { id: "notifications", label: "الإشعارات", icon: "🔔" },
  { id: "analytics", label: "الأرباح والإحصائيات", icon: "💰" },
];

const statusLabel: Record<MerchantOrderStatus, string> = {
  new: "جديد",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغي",
};

const defaultStats: MerchantStats = {
  newOrders: 0,
  processingOrders: 0,
  monthlyRevenue: "₪0",
  conversionRate: "0%",
  topProduct: "-",
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  category: "",
  subCategory: "",
  price: "",
  quantity: "",
  sizes: "",
  colors: "",
  images: "",
};

const merchantRepository = createMerchantRepository("api");

function toProductInput(form: ProductFormState): MerchantProductInput {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    subCategory: form.subCategory.trim(),
    price: form.price.trim(),
    quantity: Number(form.quantity || 0),
    sizes: parseCsvField(form.sizes),
    colors: parseCsvField(form.colors),
    images: parseCsvField(form.images),
  };
}

function toForm(product: MerchantProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category,
    subCategory: product.subCategory,
    price: product.price,
    quantity: String(product.quantity),
    sizes: product.sizes.join(", "),
    colors: product.colors.join(", "),
    images: product.images.join(", "),
  };
}

function MerchantPageContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [merchantEmail, setMerchantEmail] = useState("");
  const [merchantPhone, setMerchantPhone] = useState("");
  const [merchantPassword, setMerchantPassword] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [loginNotice, setLoginNotice] = useState("");
  const [activeTab, setActiveTab] = useState<MerchantTab>("overview");
  const [orderFilter, setOrderFilter] = useState<MerchantOrderStatus | "all">("all");
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; detail: string }>>([]);
  const [stats, setStats] = useState<MerchantStats>(defaultStats);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState<ProductFormState>(emptyForm);
  const [productNotice, setProductNotice] = useState("يمكنك إضافة صور متعددة للمنتج الواحد قبل الحفظ.");
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadDashboard = async () => {
    const [data, catalogCategories] = await Promise.all([
      merchantRepository.getDashboard(), getPublicCategories(),
    ]);
    setCategories(catalogCategories);
    setProducts(data.products);
    setOrders(data.orders);
    setNotifications(data.notifications);
    setStats(data.stats);
  };

  useEffect(() => {
    const demoMode = ENABLE_DEMO_MODE && searchParams.get("demo") === "1";
    if (demoMode) {
      const demoName = "BAMORA Demo Merchant";
      window.localStorage.setItem(ROLE_KEY, "merchant");
      window.localStorage.setItem(MERCHANT_NAME_KEY, demoName);
      setRole("merchant");
      setMerchantName(demoName);
      loadDashboard().catch((error: unknown) => {
        setLoginNotice(error instanceof Error ? error.message : "تعذر تحميل لوحة التاجر.");
      }).finally(() => setReady(true));
      return;
    }

    const savedRole = getCurrentRole();
    const savedName = window.localStorage.getItem(MERCHANT_NAME_KEY) ?? "";

    setRole(savedRole);
    setMerchantName(savedName);

    if (savedRole === "merchant") {
      loadDashboard().catch((error: unknown) => {
        clearRoleSession();
        setRole(null);
        setLoginNotice(error instanceof Error ? error.message : "تعذر تحميل لوحة التاجر. سجل الدخول مجددًا.");
      }).finally(() => setReady(true));
      return;
    }

    setReady(true);
  }, [searchParams]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.status === orderFilter);
  }, [orders, orderFilter]);

  const loginAsMerchant = async () => {
    const email = merchantEmail.trim().toLowerCase();
    const phone = merchantPhone.replace(/[^\d]/g, "");
    const password = merchantPassword;

    if (!email || password.length < 12 || password.length > 64 ||
        new TextEncoder().encode(password).length > 72) {
      setLoginNotice("أدخل بريدًا إلكترونيًا وكلمة مرور من 12 إلى 64 حرفًا (72 بايت كحد أقصى).");
      return;
    }

    setAuthBusy(true);
    try {
      if (registering) {
        if (!businessName.trim() || !phone || !/^\d{6,20}$/.test(nationalId)) {
          setLoginNotice("أكمل اسم المتجر والهاتف ورقم الهوية الصحيح.");
          return;
        }
        await merchantRepository.registerApplication({
          businessName: businessName.trim(), email, phone, nationalId, password,
        });
        setMerchantPassword("");
        setNationalId("");
        setRegistering(false);
        setLoginNotice("تم إرسال طلب الانضمام. انتظر موافقة المسؤول ثم ادخل بكلمة المرور التي اخترتها.");
        return;
      }
      const session = await merchantRepository.login({
        email,
        password,
      });

      setCurrentRole("merchant");
      window.localStorage.setItem(MERCHANT_NAME_KEY, session.email);
      setMerchantName(session.email);
      setRole("merchant");
      setActiveTab("overview");
      setLoginNotice("");
      await loadDashboard();
    } catch (error) {
      clearRoleSession();
      setRole(null);
      setLoginNotice(error instanceof Error ? error.message : "تعذر تسجيل دخول التاجر.");
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem(MERCHANT_NAME_KEY);
    clearRoleSession();
    setRole(null);
    setMerchantEmail("");
    setMerchantPhone("");
    setMerchantPassword("");
    setMerchantName("");
    setLoginNotice("");
    setProducts([]);
    setOrders([]);
    setEditingProductId(null);
    setCatalogForm(emptyForm);
  };

  const handleCatalogField = (field: keyof ProductFormState, value: string) => {
    setCatalogForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveProduct = async () => {
    const payload = toProductInput(catalogForm);
    if (!payload.name || !payload.category || !payload.price) {
      setProductNotice("الرجاء تعبئة اسم المنتج والقسم والسعر قبل الحفظ.");
      return;
    }
    if (payload.images.length === 0) {
      setProductNotice("صورة المنتج مطلوبة. ارفع صورة واحدة على الأقل قبل الحفظ.");
      return;
    }

    try {
      await merchantRepository.addProduct(payload);
      setCatalogForm(emptyForm);
      setEditingProductId(null);
      setProductNotice("تم حفظ المنتج بنجاح.");
      await loadDashboard();
    } catch (error) {
      setProductNotice(error instanceof Error ? error.message : "تعذر حفظ المنتج.");
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProductId) {
      setProductNotice("اختر منتجًا من الجدول أولًا ثم عدّل الحقول.");
      return;
    }

    const payload = toProductInput(catalogForm);
    if (payload.images.length === 0) {
      setProductNotice("صورة المنتج مطلوبة. لا يمكن حفظ التعديل بدون صورة.");
      return;
    }
    try {
      const updated = await merchantRepository.updateProduct(editingProductId, payload);
      if (!updated) {
        setProductNotice("تعذر العثور على المنتج المطلوب تحديثه.");
        return;
      }

      setProductNotice("تم تحديث بيانات المنتج.");
      await loadDashboard();
    } catch (error) {
      setProductNotice(error instanceof Error ? error.message : "تعذر تحديث المنتج.");
    }
  };

  const handleDeleteProduct = async (id?: string) => {
    const targetId = id ?? editingProductId;
    if (!targetId) {
      setProductNotice("اختر منتجًا قبل الحذف.");
      return;
    }

    try {
      await merchantRepository.deleteProduct(targetId);
      if (editingProductId === targetId) {
        setEditingProductId(null);
        setCatalogForm(emptyForm);
      }

      setProductNotice("تم حذف المنتج.");
      await loadDashboard();
    } catch (error) {
      setProductNotice(error instanceof Error ? error.message : "تعذر حذف المنتج.");
    }
  };

  const handleEditProduct = (product: MerchantProduct) => {
    setEditingProductId(product.id);
    setCatalogForm(toForm(product));
    setProductNotice(`أنت الآن تعدّل المنتج: ${product.name}`);
  };

  const handleOrderStatusChange = async (orderId: string, status: MerchantOrderStatus) => {
    await merchantRepository.updateOrderStatus(orderId, status);
    await loadDashboard();
  };

  const handleUploadProductImage = async (file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = await merchantRepository.uploadProductImage(file);
      setCatalogForm((current) => {
        const currentImages = parseCsvField(current.images);
        return {
          ...current,
          images: [...currentImages, uploaded.url].join(", "),
        };
      });
      setProductNotice("تم رفع الصورة بنجاح.");
    } catch (error) {
      setProductNotice(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (!ready) {
    return <div className={styles.shell} />;
  }

  if (role && role !== "merchant") {
    return (
      <div className={styles.loginShell}>
        <section className={styles.loginCard}>
          <p className={styles.brand}>BAMORA</p>
          <h1>صلاحية غير متاحة</h1>
          <p>هذه الواجهة مخصصة لحسابات Merchant فقط. الدور الحالي: {role}</p>
          <button type="button" className={styles.primaryButton} onClick={logout}>
            تبديل الحساب
          </button>
        </section>
      </div>
    );
  }

  if (role !== "merchant") {
    return (
      <div className={styles.loginShell}>
        <section className={styles.loginCard}>
          <p className={styles.brand}>BAMORA</p>
          <h1>{registering ? "طلب انضمام تاجر" : "بوابة التاجر"}</h1>
          <p>أدخل بيانات التاجر للدخول إلى لوحة التحكم.</p>
          {registering && <>
            <input className={styles.inputField} placeholder="اسم المتجر" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
            <input className={styles.inputField} placeholder="رقم الهوية" value={nationalId} onChange={(event) => setNationalId(event.target.value)} />
          </>}
          <input
            type="email"
            className={styles.inputField}
            placeholder="البريد الإلكتروني"
            value={merchantEmail}
            onChange={(event) => setMerchantEmail(event.target.value)}
          />
          {registering && <input
            type="text"
            className={styles.inputField}
            placeholder="رقم الهاتف"
            value={merchantPhone}
            onChange={(event) => setMerchantPhone(event.target.value)}
          />}
          <input
            type="password"
            className={styles.inputField}
            placeholder="كلمة مرور من 12 إلى 64 حرفًا"
            autoComplete={registering ? "new-password" : "current-password"}
            value={merchantPassword}
            onChange={(event) => setMerchantPassword(event.target.value)}
          />
          <button type="button" className={styles.primaryButton} disabled={authBusy} onClick={loginAsMerchant}>
            {authBusy ? "جارٍ المعالجة..." : registering ? "إرسال طلب الانضمام" : "دخول لوحة التاجر"}
          </button>
          <button type="button" className={styles.primaryButton} disabled={authBusy} onClick={() => { setRegistering(!registering); setMerchantPassword(""); setLoginNotice(""); }}>
            {registering ? "لدي حساب — تسجيل الدخول" : "تقديم طلب انضمام جديد"}
          </button>
          {loginNotice ? <p className={styles.inlineNote}>{loginNotice}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className={styles.layout} dir="rtl">
      <aside className={styles.sidebar}>
        <p className={styles.brand}>BAMORA</p>
        <div className={styles.identityCard}>
          <strong>{merchantName || "متجر BAMORA"}</strong>
          <span>Merchant Account</span>
        </div>

        <nav className={styles.nav}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? styles.navActive : styles.navItem}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.sectionTag}>BAMORA Merchant Operations</p>
            <h1>لوحة التاجر</h1>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={logout}>
            تسجيل الخروج
          </button>
        </header>

        {activeTab === "overview" && (
          <section className={styles.sectionGrid}>
            <article className={styles.statCard}>
              <p>طلبات جديدة اليوم</p>
              <strong>{stats.newOrders}</strong>
            </article>
            <article className={styles.statCard}>
              <p>قيد التجهيز</p>
              <strong>{stats.processingOrders}</strong>
            </article>
            <article className={styles.statCard}>
              <p>إجمالي الأرباح الشهرية</p>
              <strong>{stats.monthlyRevenue}</strong>
            </article>
            <article className={styles.statCard}>
              <p>إشعار فوري</p>
              <strong>{notifications[0]?.title ?? "لا يوجد إشعارات جديدة"}</strong>
            </article>
          </section>
        )}

        {activeTab === "catalog" && (
          <section className={styles.panel}>
            <h2>إضافة / تعديل / حذف المنتجات</h2>
            <p>اختر التصنيفات التي أضافها المسؤول، وارفع صورًا حقيقية. الكمية المحددة تخص كل خيار مقاس ولون. خيارات المنتج المحفوظ ثابتة للحفاظ على الطلبات؛ أنشئ منتجًا جديدًا لخيارات مختلفة.</p>
            {categories.length === 0 && <p className={styles.inlineNote} role="alert">يجب أن يضيف المسؤول التصنيفات قبل حفظ أول منتج.</p>}

            <div className={styles.formGrid}>
              <input className={styles.inputField} type="text" placeholder="اسم المنتج" value={catalogForm.name} onChange={(event) => handleCatalogField("name", event.target.value)} />
              <select aria-label="القسم الرئيسي" className={styles.inputField} value={catalogForm.category} onChange={(event) => setCatalogForm(current => ({ ...current, category: event.target.value, subCategory: "" }))}>
                <option value="">اختر القسم الرئيسي</option>
                {categories.filter(category => category.parentId === null).map(category => <option key={category.id} value={category.titleAr}>{category.titleAr}</option>)}
              </select>
              <select aria-label="القسم الفرعي" className={styles.inputField} value={catalogForm.subCategory} onChange={(event) => handleCatalogField("subCategory", event.target.value)}>
                <option value="">بدون قسم فرعي</option>
                {categories.filter(category => category.parentId === categories.find(parent => parent.parentId === null && parent.titleAr === catalogForm.category)?.id).map(category => <option key={category.id} value={category.titleAr}>{category.titleAr}</option>)}
              </select>
              <input className={styles.inputField} type="text" placeholder="السعر" value={catalogForm.price} onChange={(event) => handleCatalogField("price", event.target.value)} />
              <input className={styles.inputField} type="number" min={0} step={1} placeholder="الكمية لكل خيار مقاس ولون" value={catalogForm.quantity} onChange={(event) => handleCatalogField("quantity", event.target.value)} />
              <input className={styles.inputField} type="text" disabled={Boolean(editingProductId)} placeholder="المقاسات (S,M,L)" value={catalogForm.sizes} onChange={(event) => handleCatalogField("sizes", event.target.value)} />
              <input className={styles.inputField} type="text" disabled={Boolean(editingProductId)} placeholder="الألوان (أسود, ذهبي)" value={catalogForm.colors} onChange={(event) => handleCatalogField("colors", event.target.value)} />
              <input
                className={styles.inputField}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingImage}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleUploadProductImage(file);
                  event.currentTarget.value = "";
                }}
              />
              <input className={styles.inputField} type="text" placeholder="روابط الصور المتعددة أو أسماء الملفات" value={catalogForm.images} onChange={(event) => handleCatalogField("images", event.target.value)} />
              <textarea className={`${styles.inputField} ${styles.inputTextarea}`} rows={4} maxLength={5000} placeholder="وصف المنتج" value={catalogForm.description} onChange={(event) => handleCatalogField("description", event.target.value)} />
            </div>

            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={handleSaveProduct}>حفظ المنتج</button>
              <button type="button" className={styles.secondaryButton} onClick={handleUpdateProduct}>تحديث المنتج</button>
              <button type="button" className={styles.secondaryButton} onClick={() => handleDeleteProduct()}>حذف المنتج</button>
            </div>
            <p className={styles.inlineNote}>{productNotice}</p>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>القسم</th>
                    <th>الصور</th>
                    <th>المخزون</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        <span>{product.price}</span>
                      </td>
                      <td>{product.category} / {product.subCategory}</td>
                      <td>
                        {product.images[0] ? <img src={product.images[0]} alt={product.name} className={styles.productThumb} loading="lazy" /> : null}
                        <span>{product.images.length} صور</span>
                      </td>
                      <td>{product.quantity}</td>
                      <td className={styles.tableActions}>
                        <button type="button" className={styles.tableButton} onClick={() => handleEditProduct(product)}>تعديل</button>
                        <button type="button" className={styles.tableButton} onClick={() => handleDeleteProduct(product.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "orders" && (
          <section className={styles.panel}>
            <h2>إدارة الطلبات وحالاتها</h2>
            <div className={styles.filterRow}>
              <span>فلترة الحالة</span>
              <select className={`${styles.inputField} ${styles.inputSelect}`} value={orderFilter} onChange={(event) => setOrderFilter(event.target.value as MerchantOrderStatus | "all")}>
                <option value="all">الكل</option>
                <option value="new">جديد</option>
                <option value="preparing">قيد التجهيز</option>
                <option value="shipped">تم الشحن</option>
                <option value="delivered">تم التسليم</option>
                <option value="canceled">ملغي</option>
              </select>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>عناصر الطلب</th>
                    <th>الحالة</th>
                    <th>تحديث الحالة</th>
                    <th>الإجمالي</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.customer}</td>
                      <td>
                        <div className={styles.orderItemList}>
                          {(order.items ?? []).map((item) => (
                            <div key={item.id} className={styles.orderItemRow}>
                              {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className={styles.orderItemImage} loading="lazy" /> : null}
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.quantity} × {item.unitPrice}</span>
                                <span>{item.size} • {item.color}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.status} ${styles[`status${order.status}`]}`}>{statusLabel[order.status]}</span>
                      </td>
                      <td>
                        <select
                          className={`${styles.inputField} ${styles.inputSelect}`}
                          value={order.status}
                          onChange={(event) => handleOrderStatusChange(order.id, event.target.value as MerchantOrderStatus)}
                        >
                          <option value="new">جديد</option>
                          <option value="preparing">قيد التجهيز</option>
                          <option value="shipped">تم الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="canceled">ملغي</option>
                        </select>
                      </td>
                      <td>{order.total}</td>
                      <td>{order.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "promotions" && (
          <section className={styles.panel}>
            <h2>العروض والخصومات والكوبونات</h2>
            <div className={styles.sectionGrid}>
              <article className={styles.softCard}>
                <p>كوبون نشط</p>
                <strong>GOLD25</strong>
                <span>خصم 25% حتى نهاية الشهر</span>
              </article>
              <article className={styles.softCard}>
                <p>عرض مجاني</p>
                <strong>توصيل مجاني</strong>
                <span>لطلبات أعلى من ₪500</span>
              </article>
              <article className={styles.softCard}>
                <p>حزمة موسمية</p>
                <strong>Summer Edit</strong>
                <span>3 قطع بسعر خاص</span>
              </article>
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className={styles.panel}>
            <h2>إشعارات الطلبات الجديدة</h2>
            <div className={styles.noticeList}>
              {notifications.map((notification) => (
                <article key={notification.id} className={styles.noticeCard}>
                  <strong>{notification.title}</strong>
                  <span>{notification.detail}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "analytics" && (
          <section className={styles.panel}>
            <h2>الأرباح والإحصائيات</h2>
            <div className={styles.sectionGrid}>
              <article className={styles.statCard}>
                <p>مبيعات الشهر</p>
                <strong>{stats.monthlyRevenue}</strong>
              </article>
              <article className={styles.statCard}>
                <p>معدل التحويل</p>
                <strong>{stats.conversionRate}</strong>
              </article>
              <article className={styles.statCard}>
                <p>المنتج الأعلى ربحًا</p>
                <strong>{stats.topProduct}</strong>
              </article>
              <article className={styles.statCard}>
                <p>عدد المنتجات</p>
                <strong>{products.length}</strong>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function MerchantPage() {
  return (
    <Suspense fallback={<div className={styles.shell} />}>
      <MerchantPageContent />
    </Suspense>
  );
}
