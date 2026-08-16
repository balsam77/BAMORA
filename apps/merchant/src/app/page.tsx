"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearRoleSession,
  createMerchantRepository,
  getCurrentRole,
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

type MerchantTab = "overview" | "catalog" | "orders" | "promotions" | "notifications" | "analytics";

type ProductFormState = {
  name: string;
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
  category: "",
  subCategory: "",
  price: "",
  quantity: "",
  sizes: "",
  colors: "",
  images: "",
};

const merchantRepository = createMerchantRepository();

function toProductInput(form: ProductFormState): MerchantProductInput {
  return {
    name: form.name.trim(),
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
  const [merchantCode, setMerchantCode] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [activeTab, setActiveTab] = useState<MerchantTab>("overview");
  const [orderFilter, setOrderFilter] = useState<MerchantOrderStatus | "all">("all");
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; detail: string }>>([]);
  const [stats, setStats] = useState<MerchantStats>(defaultStats);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState<ProductFormState>(emptyForm);
  const [productNotice, setProductNotice] = useState("يمكنك إضافة صور متعددة للمنتج الواحد قبل الحفظ.");

  const loadDashboard = async () => {
    const data = await merchantRepository.getDashboard();
    setProducts(data.products);
    setOrders(data.orders);
    setNotifications(data.notifications);
    setStats(data.stats);
  };

  useEffect(() => {
    const demoMode = searchParams.get("demo") === "1";
    if (demoMode) {
      const demoName = "BAMORA Demo Merchant";
      window.localStorage.setItem(ROLE_KEY, "merchant");
      window.localStorage.setItem(MERCHANT_NAME_KEY, demoName);
      setRole("merchant");
      setMerchantName(demoName);
      loadDashboard().finally(() => setReady(true));
      return;
    }

    const savedRole = getCurrentRole();
    const savedName = window.localStorage.getItem(MERCHANT_NAME_KEY) ?? "";

    setRole(savedRole);
    setMerchantName(savedName);

    if (savedRole === "merchant") {
      loadDashboard().finally(() => setReady(true));
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
    const normalizedName = merchantName.trim() || merchantCode.trim();
    if (!normalizedName) {
      return;
    }

    setCurrentRole("merchant");
    window.localStorage.setItem(MERCHANT_NAME_KEY, normalizedName);
    setMerchantName(normalizedName);
    setRole("merchant");
    setActiveTab("overview");
    await loadDashboard();
  };

  const logout = () => {
    window.localStorage.removeItem(MERCHANT_NAME_KEY);
    clearRoleSession();
    setRole(null);
    setMerchantCode("");
    setMerchantName("");
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

    await merchantRepository.addProduct(payload);
    setCatalogForm(emptyForm);
    setEditingProductId(null);
    setProductNotice("تم حفظ المنتج بنجاح.");
    await loadDashboard();
  };

  const handleUpdateProduct = async () => {
    if (!editingProductId) {
      setProductNotice("اختر منتجًا من الجدول أولًا ثم عدّل الحقول.");
      return;
    }

    const payload = toProductInput(catalogForm);
    const updated = await merchantRepository.updateProduct(editingProductId, payload);
    if (!updated) {
      setProductNotice("تعذر العثور على المنتج المطلوب تحديثه.");
      return;
    }

    setProductNotice("تم تحديث بيانات المنتج.");
    await loadDashboard();
  };

  const handleDeleteProduct = async (id?: string) => {
    const targetId = id ?? editingProductId;
    if (!targetId) {
      setProductNotice("اختر منتجًا قبل الحذف.");
      return;
    }

    await merchantRepository.deleteProduct(targetId);
    if (editingProductId === targetId) {
      setEditingProductId(null);
      setCatalogForm(emptyForm);
    }

    setProductNotice("تم حذف المنتج.");
    await loadDashboard();
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
          <h1>بوابة التاجر</h1>
          <p>أدخل رمز التاجر واسم المتجر للدخول إلى لوحة التحكم.</p>
          <input
            type="text"
            className={styles.inputField}
            placeholder="رمز التاجر"
            value={merchantCode}
            onChange={(event) => setMerchantCode(event.target.value)}
          />
          <input
            type="text"
            className={styles.inputField}
            placeholder="اسم المتجر"
            value={merchantName}
            onChange={(event) => setMerchantName(event.target.value)}
          />
          <button type="button" className={styles.primaryButton} onClick={loginAsMerchant}>
            دخول لوحة التاجر
          </button>
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
            <p>يمكنك إنشاء أقسام فرعية، رفع صور متعددة، وضبط السعر والكمية والمقاسات والألوان.</p>

            <div className={styles.formGrid}>
              <input className={styles.inputField} type="text" placeholder="اسم المنتج" value={catalogForm.name} onChange={(event) => handleCatalogField("name", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="القسم الرئيسي" value={catalogForm.category} onChange={(event) => handleCatalogField("category", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="قسم فرعي (مثال: فساتين سهرة)" value={catalogForm.subCategory} onChange={(event) => handleCatalogField("subCategory", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="السعر" value={catalogForm.price} onChange={(event) => handleCatalogField("price", event.target.value)} />
              <input className={styles.inputField} type="number" placeholder="الكمية" value={catalogForm.quantity} onChange={(event) => handleCatalogField("quantity", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="المقاسات (S,M,L)" value={catalogForm.sizes} onChange={(event) => handleCatalogField("sizes", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="الألوان (أسود, ذهبي)" value={catalogForm.colors} onChange={(event) => handleCatalogField("colors", event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="روابط الصور المتعددة أو أسماء الملفات" value={catalogForm.images} onChange={(event) => handleCatalogField("images", event.target.value)} />
              <textarea className={`${styles.inputField} ${styles.inputTextarea}`} rows={4} placeholder="وصف المنتج (اختياري)" readOnly value="الوصف التفصيلي يُربط في API لاحقًا ضمن نفس payload." />
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
                      <td>{product.images.length} صور</td>
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
