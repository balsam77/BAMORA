"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ADMIN_NAME_KEY,
  type AdminAlertRecord,
  clearRoleSession,
  createAdminRepository,
  getCurrentRole,
  ROLE_KEY,
  setCurrentRole,
  type AdminOrderRecord,
  type AdminProductRecord,
  type AppRole,
  type BamoraFeeRecord,
  type BroadcastRecord,
  type CategoryRecord,
  type GlobalOfferRecord,
  type MerchantActivityRecord,
  type MerchantApprovalStatus,
  type MerchantOrderStatus,
  type MerchantPlanChoice,
  type MerchantAttentionStatus,
  type MerchantRecord,
  type PlanApprovalRecord,
  type PlatformStats,
  type PlatformUserRecord,
  type PlatformUserStatus,
  type SupportTicketRecord,
  type SupportTicketStatus,
} from "@bamora/platform";
import styles from "./page.module.css";

type AdminTab = "overview" | "merchants" | "products" | "orders" | "monitoring" | "users" | "support" | "broadcast" | "categories" | "settings";

type CategoryFormState = {
  id: string;
  nameAr: string;
  slug: string;
  icon: string;
  parentId: string;
};

const tabs: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: "overview", label: "لوحة التحكم", icon: "📊" },
  { id: "merchants", label: "إدارة التجار", icon: "🏪" },
  { id: "products", label: "جميع المنتجات", icon: "🧾" },
  { id: "orders", label: "جميع الطلبات", icon: "🚚" },
  { id: "monitoring", label: "المراقبة", icon: "🛡️" },
  { id: "users", label: "إدارة المستخدمين", icon: "👥" },
  { id: "support", label: "الدعم والشكاوى", icon: "🆘" },
  { id: "broadcast", label: "الإشعارات والعروض", icon: "📢" },
  { id: "categories", label: "الأقسام الرئيسية", icon: "🗂️" },
  { id: "settings", label: "إعدادات المنصة", icon: "⚙️" },
];

const merchantStatusLabel: Record<MerchantApprovalStatus, string> = {
  pending: "بانتظار الموافقة",
  active: "مقبول",
  rejected: "مرفوض",
  suspended: "موقوف",
};

const orderStatusLabel: Record<MerchantOrderStatus, string> = {
  new: "جديد",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغي",
};

const userStatusLabel: Record<PlatformUserStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
};

const supportStatusLabel: Record<SupportTicketStatus, string> = {
  open: "مفتوح",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
};

const planLabel: Record<MerchantPlanChoice, string> = {
  monthly_subscription: "الخطة الشهرية",
  bamora_commission: "BAMORA Fee 20%",
  ten_order_limit: "خطة 10 طلبات",
};

const attentionLabel: Record<MerchantAttentionStatus, string> = {
  normal: "طبيعي",
  pending_review: "قيد المراجعة",
  pending_bamora_payment: "بانتظار سداد BAMORA Fee",
  delayed: "متأخر",
};

const defaultStats: PlatformStats = {
  merchantCount: 0,
  customerCount: 0,
  subscriberCount: 0,
  dailyOrders: 0,
  monthlyOrders: 0,
  platformRevenue: "₪0",
};

const emptyCategory: CategoryFormState = {
  id: "",
  nameAr: "",
  slug: "",
  icon: "",
  parentId: "",
};

const adminRepository = createAdminRepository("api");
const ENABLE_DEMO_MODE = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "1";

function AdminPageContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [orderFilter, setOrderFilter] = useState<MerchantOrderStatus | "all">("all");
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [products, setProducts] = useState<AdminProductRecord[]>([]);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [pendingPlanApprovals, setPendingPlanApprovals] = useState<PlanApprovalRecord[]>([]);
  const [bamoraFees, setBamoraFees] = useState<BamoraFeeRecord[]>([]);
  const [delayedOrders, setDelayedOrders] = useState<AdminOrderRecord[]>([]);
  const [alerts, setAlerts] = useState<AdminAlertRecord[]>([]);
  const [merchantActivity, setMerchantActivity] = useState<MerchantActivityRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketRecord[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastRecord[]>([]);
  const [offersHistory, setOffersHistory] = useState<GlobalOfferRecord[]>([]);
  const [stats, setStats] = useState<PlatformStats>(defaultStats);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategory);
  const [platformNotice, setPlatformNotice] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<"all-users" | "customers" | "merchants">("all-users");
  const [broadcastTitle, setBroadcastTitle] = useState("إشعار عام");
  const [broadcastBody, setBroadcastBody] = useState("تم إرسال إشعار جديد من لوحة الإدارة");
  const [offerTitle, setOfferTitle] = useState("عرض المنصة");
  const [offerCode, setOfferCode] = useState("BAMORA10");
  const [offerDiscountText, setOfferDiscountText] = useState("خصم موسمي");

  const loadDashboard = async () => {
    const data = await adminRepository.getDashboard();
    setMerchants(data.merchants);
    setProducts(data.products);
    setOrders(data.orders);
    setPendingPlanApprovals(data.pendingPlanApprovals);
    setBamoraFees(data.bamoraFees);
    setDelayedOrders(data.delayedOrders);
    setAlerts(data.alerts);
    setMerchantActivity(data.merchantActivity);
    setCategories(data.categories);
    setUsers(data.users);
    setSupportTickets(data.supportTickets);
    setBroadcastHistory(data.broadcasts);
    setOffersHistory(data.offers);
    setStats(data.stats);
  };

  useEffect(() => {
    const demoMode = ENABLE_DEMO_MODE && searchParams.get("demo") === "1";
    if (demoMode) {
      const demoName = "BAMORA Super Admin";
      window.localStorage.setItem(ROLE_KEY, "super-admin");
      window.localStorage.setItem(ADMIN_NAME_KEY, demoName);
      setRole("super-admin");
      setAdminName(demoName);
      loadDashboard().catch((error: unknown) => {
        setLoginNotice(error instanceof Error ? error.message : "تعذر تحميل لوحة المسؤول.");
      }).finally(() => setReady(true));
      return;
    }

    const savedRole = getCurrentRole();
    const savedName = window.localStorage.getItem(ADMIN_NAME_KEY) ?? "";
    setRole(savedRole);
    setAdminName(savedName);

    if (savedRole === "super-admin") {
      loadDashboard().catch((error: unknown) => {
        clearRoleSession();
        setRole(null);
        setLoginNotice(error instanceof Error ? error.message : "تعذر تحميل لوحة المسؤول. سجل الدخول مجددًا.");
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

  const loginAsAdmin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setLoginNotice("أكمل الحقول المطلوبة.");
      return;
    }

    try {
      const session = await adminRepository.login({
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword.trim(),
      });
      setCurrentRole("super-admin");
      setAdminName(window.localStorage.getItem(ADMIN_NAME_KEY) ?? session.email);
      setRole(session.role);
      setActiveTab("overview");
      setLoginNotice("");
      await loadDashboard();
    } catch (error) {
      clearRoleSession();
      setRole(null);
      setLoginNotice(error instanceof Error ? error.message : "تعذر تسجيل دخول المسؤول.");
    }
  };

  const logout = () => {
    window.localStorage.removeItem(ADMIN_NAME_KEY);
    clearRoleSession();
    setRole(null);
    setAdminEmail("");
    setAdminName("");
    setAdminPassword("");
    setLoginNotice("");
    setMerchants([]);
    setProducts([]);
    setOrders([]);
    setPendingPlanApprovals([]);
    setBamoraFees([]);
    setDelayedOrders([]);
    setAlerts([]);
    setMerchantActivity([]);
    setCategories([]);
    setUsers([]);
    setSupportTickets([]);
    setBroadcastHistory([]);
    setOffersHistory([]);
  };

  const updateMerchantStatus = async (id: string, status: MerchantApprovalStatus) => {
    try {
      await adminRepository.updateMerchantStatus(id, status);
      await loadDashboard();
      setPlatformNotice("تم تحديث حالة المتجر بنجاح.");
    } catch (error) {
      setPlatformNotice(error instanceof Error ? error.message : "تعذر تحديث حالة المتجر.");
    }
  };

  const deleteMerchant = async (id: string) => {
    await adminRepository.deleteMerchant(id);
    await loadDashboard();
    setPlatformNotice("تم حذف المتجر.");
  };

  const reviewMerchantPlan = async (id: string, decision: "approve" | "reject") => {
    await adminRepository.reviewMerchantPlan(id, decision);
    await loadDashboard();
    setPlatformNotice(decision === "approve" ? "تمت الموافقة على الخطة." : "تم رفض الخطة.");
  };

  const confirmBamoraPayment = async (id: string) => {
    await adminRepository.confirmBamoraPayment(id);
    await loadDashboard();
    setPlatformNotice("تم تأكيد سداد BAMORA Fee.");
  };

  const reopenMerchant = async (id: string) => {
    await adminRepository.reopenMerchant(id);
    await loadDashboard();
    setPlatformNotice("تمت إعادة فتح التاجر بعد التسوية.");
  };

  const resolveAlert = async (id: string) => {
    await adminRepository.resolveAlert(id);
    await loadDashboard();
    setPlatformNotice("تمت معالجة التنبيه.");
  };

  const deleteProduct = async (id: string) => {
    await adminRepository.deleteProduct(id);
    await loadDashboard();
    setPlatformNotice("تم حذف المنتج من المنصة.");
  };

  const updateOrderStatus = async (id: string, status: MerchantOrderStatus) => {
    await adminRepository.updateOrderStatus(id, status);
    await loadDashboard();
  };

  const sendBroadcast = async () => {
    await adminRepository.sendBroadcast({
      audience: broadcastAudience,
      title: broadcastTitle,
      body: broadcastBody,
    });
    await loadDashboard();
    setPlatformNotice("تم إرسال الإشعار بنجاح.");
  };

  const createOffer = async () => {
    await adminRepository.createGlobalOffer({
      title: offerTitle,
      discountText: offerDiscountText,
      code: offerCode,
    });
    await loadDashboard();
    setPlatformNotice("تم إنشاء عرض عام جديد.");
  };

  const updateUserStatus = async (id: string, status: PlatformUserStatus) => {
    await adminRepository.updateUserStatus(id, status);
    await loadDashboard();
    setPlatformNotice("تم تحديث حالة المستخدم.");
  };

  const deleteUser = async (id: string) => {
    await adminRepository.deleteUser(id);
    await loadDashboard();
    setPlatformNotice("تم حذف المستخدم.");
  };

  const assignSupportTicket = async (id: string) => {
    await adminRepository.assignSupportTicket(id, "فريق الدعم");
    await loadDashboard();
    setPlatformNotice("تم إسناد الشكوى لفريق الدعم.");
  };

  const updateSupportTicket = async (id: string, status: SupportTicketStatus) => {
    await adminRepository.updateSupportTicketStatus(id, status);
    await loadDashboard();
    setPlatformNotice("تم تحديث حالة الشكوى.");
  };

  const editCategory = (category: CategoryRecord) => {
    setCategoryForm({
      id: category.id,
      nameAr: category.nameAr,
      slug: category.slug,
      icon: category.icon,
      parentId: category.parentId ?? "",
    });
  };

  const saveCategory = async () => {
    if (!categoryForm.nameAr || !categoryForm.slug || !categoryForm.icon) {
      setPlatformNotice("املأ اسم القسم والـ slug والأيقونة.");
      return;
    }

    try {
      await adminRepository.upsertCategory({
        id: categoryForm.id || undefined,
        nameAr: categoryForm.nameAr,
        slug: categoryForm.slug,
        icon: categoryForm.icon,
        parentId: categoryForm.parentId || null,
      });

      setCategoryForm(emptyCategory);
      await loadDashboard();
      setPlatformNotice("تم حفظ القسم بنجاح.");
    } catch (error) {
      setPlatformNotice(error instanceof Error ? error.message : "تعذر حفظ القسم.");
    }
  };

  const removeCategory = async () => {
    if (!categoryForm.id) {
      setPlatformNotice("اختر قسمًا من الجدول أولًا.");
      return;
    }

    await adminRepository.deleteCategory(categoryForm.id);
    setCategoryForm(emptyCategory);
    await loadDashboard();
    setPlatformNotice("تم حذف القسم.");
  };

  if (!ready) {
    return <div className={styles.shell} />;
  }

  if (role && role !== "super-admin") {
    return (
      <div className={styles.loginShell}>
        <section className={styles.loginCard}>
          <p className={styles.brand}>BAMORA</p>
          <h1>صلاحية غير متاحة</h1>
          <p>هذه اللوحة مخصصة لحسابات Super Admin فقط. الدور الحالي: {role}</p>
          <button type="button" className={styles.primaryButton} onClick={logout}>
            تبديل الحساب
          </button>
        </section>
      </div>
    );
  }

  if (role !== "super-admin") {
    return (
      <div className={styles.loginShell}>
        <section className={styles.loginCard}>
          <p className={styles.brand}>BAMORA</p>
          <h1>لوحة إدارة BAMORA</h1>
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="text"
            className={styles.inputField}
            placeholder="bamora"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            className={styles.inputField}
            placeholder="balsam99"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
          />
          <button type="button" className={styles.primaryButton} onClick={loginAsAdmin}>
            دخول Super Admin
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
          <strong>{adminName || "Company Owner"}</strong>
          <span>Super Admin</span>
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
            <p className={styles.sectionTag}>BAMORA Platform Control Center</p>
            <h1>Super Admin Dashboard</h1>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={logout}>
            تسجيل الخروج
          </button>
        </header>
        {platformNotice && <p className={styles.inlineNote} role="status">{platformNotice}</p>}

        {activeTab === "overview" && (
          <section className={styles.grid}>
            <article className={styles.statCard}><p>إجمالي التجار</p><strong>{stats.merchantCount}</strong></article>
            <article className={styles.statCard}><p>إجمالي الزبائن</p><strong>{stats.customerCount}</strong></article>
            <article className={styles.statCard}><p>إجمالي المشتركين</p><strong>{stats.subscriberCount}</strong></article>
            <article className={styles.statCard}><p>طلبات اليوم</p><strong>{stats.dailyOrders}</strong></article>
            <article className={styles.statCard}><p>طلبات الشهر</p><strong>{stats.monthlyOrders}</strong></article>
            <article className={styles.statCard}><p>أرباح المنصة</p><strong>{stats.platformRevenue}</strong></article>
            <article className={styles.statCard}><p>خطط بانتظار الموافقة</p><strong>{pendingPlanApprovals.length}</strong></article>
            <article className={styles.statCard}><p>طلبات متأخرة</p><strong>{delayedOrders.length}</strong></article>
            <article className={styles.statCard}><p>تنبيهات مفتوحة</p><strong>{alerts.length}</strong></article>
            <article className={styles.statCard}><p>دفعات BAMORA المعلقة</p><strong>{bamoraFees.filter((item) => item.paymentStatus !== "CONFIRMED").length}</strong></article>
          </section>
        )}

        {activeTab === "merchants" && (
          <section className={styles.panel}>
            <h2>إدارة التجار</h2>
            <p>موافقة أو رفض التجار الجدد، إيقاف متجر، أو حذفه بالكامل.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>المتجر</th>
                    <th>الحالة</th>
                    <th>الخطة</th>
                    <th>المستحق</th>
                    <th>الطلبات</th>
                    <th>الإيراد</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td><strong>{merchant.name}</strong><span>{merchant.id}</span></td>
                      <td><span className={`${styles.badge} ${styles[`merchant${merchant.status}`]}`}>{merchantStatusLabel[merchant.status]}</span></td>
                      <td>{merchant.selectedPlan ? planLabel[merchant.selectedPlan] : "-"}</td>
                      <td>{merchant.outstandingBalance ?? "₪0 ILS"}</td>
                      <td>{merchant.orders}</td>
                      <td>{merchant.revenue}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => updateMerchantStatus(merchant.id, "active")}>قبول</button>
                        <button type="button" className={styles.tableButton} onClick={() => updateMerchantStatus(merchant.id, "rejected")}>رفض</button>
                        <button type="button" className={styles.tableButton} onClick={() => updateMerchantStatus(merchant.id, "suspended")}>إيقاف</button>
                        <button type="button" className={styles.tableButton} onClick={() => reopenMerchant(merchant.id)}>إعادة فتح</button>
                        <button type="button" className={styles.tableButton} onClick={() => deleteMerchant(merchant.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "products" && (
          <section className={styles.panel}>
            <h2>جميع المنتجات في المنصة</h2>
            <p>يمكنك تعديل أو حذف أي منتج لأي تاجر.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>التاجر</th>
                    <th>المخزون</th>
                    <th>السعر</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong><span>{product.id}</span></td>
                      <td>{product.merchant}</td>
                      <td>{product.stock}</td>
                      <td>{product.price}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton}>تعديل</button>
                        <button type="button" className={styles.tableButton} onClick={() => deleteProduct(product.id)}>حذف</button>
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
            <h2>متابعة جميع الطلبات</h2>
            <div className={styles.filterRow}>
              <span>فلترة حسب الحالة</span>
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
                    <th>التاجر</th>
                    <th>العميل</th>
                    <th>تفاصيل المنتجات</th>
                    <th>الحالة</th>
                    <th>المتابعة</th>
                    <th>BAMORA Fee</th>
                    <th>السداد</th>
                    <th>تحديث الحالة</th>
                    <th>الإجمالي</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.merchant}</td>
                      <td>{order.customer}</td>
                      <td>
                        <div className={styles.orderItemList}>
                          {(order.items ?? []).map((item) => (
                            <article key={item.id} className={styles.orderItemCard}>
                              {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className={styles.orderItemImage} loading="lazy" /> : null}
                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.quantity} × {item.unitPrice}</span>
                                <span>{item.size} • {item.color}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </td>
                      <td><span className={`${styles.badge} ${styles[`order${order.status}`]}`}>{orderStatusLabel[order.status]}</span></td>
                      <td>{order.attentionState ? attentionLabel[order.attentionState] : "طبيعي"}</td>
                      <td>{order.bamoraFee ?? "-"}</td>
                      <td>{order.paymentStatus ?? "-"}</td>
                      <td>
                        <select
                          className={`${styles.inputField} ${styles.inputSelect}`}
                          value={order.status}
                          onChange={(event) => updateOrderStatus(order.id, event.target.value as MerchantOrderStatus)}
                        >
                          <option value="new">جديد</option>
                          <option value="preparing">قيد التجهيز</option>
                          <option value="shipped">تم الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="canceled">ملغي</option>
                        </select>
                      </td>
                      <td>{order.total}</td>
                      <td>{order.createdAt ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "monitoring" && (
          <section className={styles.panel}>
            <h2>المراقبة والتحكم</h2>
            <div className={styles.grid}>
              <article className={styles.softCard}>
                <p>طلبات الخطط</p>
                {pendingPlanApprovals.slice(0, 4).map((item) => (
                  <p key={item.id}>{item.merchant} - {item.selectedPlan ? planLabel[item.selectedPlan] : "-"}</p>
                ))}
              </article>
              <article className={styles.softCard}>
                <p>الطلبات المتأخرة</p>
                {delayedOrders.slice(0, 4).map((item) => (
                  <p key={item.id}>{item.id} - {item.merchant}</p>
                ))}
              </article>
              <article className={styles.softCard}>
                <p>تنبيهات مفتوحة</p>
                {alerts.slice(0, 4).map((item) => (
                  <p key={item.id}>{item.title}</p>
                ))}
              </article>
              <article className={styles.softCard}>
                <p>أحدث نشاط</p>
                {merchantActivity.slice(0, 4).map((item) => (
                  <p key={item.id}>{item.merchant} - {item.action}</p>
                ))}
              </article>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>التاجر</th>
                    <th>الخطة</th>
                    <th>الحالة</th>
                    <th>الوقت</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPlanApprovals.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.merchant}</strong><span>{item.email}</span></td>
                      <td>{item.selectedPlan ? planLabel[item.selectedPlan] : "-"}</td>
                      <td>{item.approvalStatus}</td>
                      <td>{item.requestedAt}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => reviewMerchantPlan(item.merchantId, "approve")}>موافقة</button>
                        <button type="button" className={styles.tableButton} onClick={() => reviewMerchantPlan(item.merchantId, "reject")}>رفض</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>التاجر</th>
                    <th>رقم الطلب</th>
                    <th>المبلغ</th>
                    <th>BAMORA Fee</th>
                    <th>السداد</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {bamoraFees.map((item) => (
                    <tr key={item.id}>
                      <td>{item.merchant}</td>
                      <td>{item.orderNumber}</td>
                      <td>{item.orderAmount}</td>
                      <td>{item.bamoraFee}</td>
                      <td>{item.paymentStatus}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => confirmBamoraPayment(item.id)}>تأكيد السداد</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>التنبيه</th>
                    <th>التاجر</th>
                    <th>الطلب</th>
                    <th>الوقت</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><span>{item.body}</span></td>
                      <td>{item.merchant}</td>
                      <td>{item.orderNumber}</td>
                      <td>{item.createdAt}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => resolveAlert(item.id)}>حل</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>التاجر</th>
                    <th>الحدث</th>
                    <th>الكيان</th>
                    <th>التفاصيل</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {merchantActivity.map((item) => (
                    <tr key={item.id}>
                      <td>{item.merchant}</td>
                      <td>{item.action}</td>
                      <td>{item.entityType}</td>
                      <td>{item.details || item.entityId}</td>
                      <td>{item.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className={styles.panel}>
            <h2>إدارة المستخدمين</h2>
            <p>عرض جميع المستخدمين وتعليق أو حذف الحسابات المخالفة.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البريد</th>
                    <th>الدور</th>
                    <th>الحالة</th>
                    <th>تاريخ الانضمام</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.name}</strong><span>{user.id}</span></td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`merchant${user.status === "active" ? "active" : "suspended"}`]}`}>
                          {userStatusLabel[user.status]}
                        </span>
                      </td>
                      <td>{user.joinedAt}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => updateUserStatus(user.id, "active")}>تفعيل</button>
                        <button type="button" className={styles.tableButton} onClick={() => updateUserStatus(user.id, "suspended")}>إيقاف</button>
                        <button type="button" className={styles.tableButton} onClick={() => deleteUser(user.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "support" && (
          <section className={styles.panel}>
            <h2>إدارة الشكاوى والدعم الفني</h2>
            <p>تعيين الشكاوى لفريق الدعم وتحديث حالة المعالجة.</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>رقم التذكرة</th>
                    <th>المستخدم</th>
                    <th>الموضوع</th>
                    <th>الحالة</th>
                    <th>المسؤول</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {supportTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.userName}</td>
                      <td><strong>{ticket.subject}</strong><span>{ticket.createdAt}</span></td>
                      <td>
                        <span className={`${styles.badge} ${styles[`order${ticket.status === "resolved" ? "delivered" : ticket.status === "in_progress" ? "preparing" : "new"}`]}`}>
                          {supportStatusLabel[ticket.status]}
                        </span>
                      </td>
                      <td>{ticket.assignedTo ?? "غير مسند"}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => assignSupportTicket(ticket.id)}>إسناد</button>
                        <button type="button" className={styles.tableButton} onClick={() => updateSupportTicket(ticket.id, "in_progress")}>قيد المعالجة</button>
                        <button type="button" className={styles.tableButton} onClick={() => updateSupportTicket(ticket.id, "resolved")}>إغلاق</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "broadcast" && (
          <section className={styles.panel}>
            <h2>الإشعارات والعروض العامة</h2>
            <p>إرسال إشعارات لجميع المستخدمين أو جميع التجار، وإنشاء عروض على مستوى المنصة.</p>
            <div className={styles.formGrid}>
              <select className={`${styles.inputField} ${styles.inputSelect}`} value={broadcastAudience} onChange={(event) => setBroadcastAudience(event.target.value as "all-users" | "customers" | "merchants")}>
                <option value="all-users">كل المستخدمين</option>
                <option value="customers">العملاء فقط</option>
                <option value="merchants">التجار فقط</option>
              </select>
              <input className={styles.inputField} type="text" placeholder="عنوان الإشعار" value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} />
              <textarea className={`${styles.inputField} ${styles.inputTextarea}`} rows={4} placeholder="نص الإشعار أو العرض" value={broadcastBody} onChange={(event) => setBroadcastBody(event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="عنوان العرض" value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="كود العرض العام (اختياري)" value={offerCode} onChange={(event) => setOfferCode(event.target.value)} />
              <input className={styles.inputField} type="text" placeholder="نص الخصم" value={offerDiscountText} onChange={(event) => setOfferDiscountText(event.target.value)} />
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={sendBroadcast}>إرسال</button>
              <button type="button" className={styles.secondaryButton} onClick={createOffer}>إنشاء عرض عام</button>
            </div>

            <div className={styles.grid}>
              <article className={styles.softCard}>
                <p>سجل الإشعارات</p>
                {broadcastHistory.slice(0, 3).map((item) => (
                  <p key={item.id}>{item.title} - {item.audience}</p>
                ))}
              </article>
              <article className={styles.softCard}>
                <p>العروض والكوبونات</p>
                {offersHistory.slice(0, 3).map((item) => (
                  <p key={item.id}>{item.title} - {item.code ?? "بدون كود"}</p>
                ))}
              </article>
            </div>
          </section>
        )}

        {activeTab === "categories" && (
          <section className={styles.panel}>
            <h2>إدارة الأقسام الرئيسية والفرعية</h2>
            <p>إضافة، تعديل أو حذف أي قسم في أي وقت.</p>
            <div className={styles.formGrid}>
              <input className={styles.inputField} type="text" placeholder="اسم القسم بالعربية" value={categoryForm.nameAr} onChange={(event) => setCategoryForm((current) => ({ ...current, nameAr: event.target.value }))} />
              <input className={styles.inputField} type="text" placeholder="Category slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} />
              <input className={styles.inputField} type="text" placeholder="الأيقونة (Emoji)" value={categoryForm.icon} onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))} />
              <input className={styles.inputField} type="text" placeholder="Parent ID (اختياري)" value={categoryForm.parentId} onChange={(event) => setCategoryForm((current) => ({ ...current, parentId: event.target.value }))} />
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={saveCategory}>إضافة/حفظ قسم</button>
              <button type="button" className={styles.secondaryButton} onClick={saveCategory}>تعديل قسم</button>
              <button type="button" className={styles.secondaryButton} onClick={removeCategory}>حذف قسم</button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>Slug</th>
                    <th>Parent</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.icon} {category.nameAr}</td>
                      <td>{category.slug}</td>
                      <td>{category.parentId ?? "-"}</td>
                      <td className={styles.actionsCell}>
                        <button type="button" className={styles.tableButton} onClick={() => editCategory(category)}>تحميل للتعديل</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "settings" && (
          <section className={styles.panel}>
            <h2>التحكم بإعدادات المنصة</h2>
            <div className={styles.grid}>
              <article className={styles.softCard}><p>عمولة المنصة</p><strong>8%</strong></article>
              <article className={styles.softCard}><p>حد الشحن المجاني</p><strong>₪500</strong></article>
              <article className={styles.softCard}><p>وضع الصيانة</p><strong>غير مفعّل</strong></article>
              <article className={styles.softCard}><p>العملة الأساسية</p><strong>ILS</strong></article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className={styles.shell} />}>
      <AdminPageContent />
    </Suspense>
  );
}
