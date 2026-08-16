export type AppRole = "customer" | "merchant" | "super-admin";
export type MerchantOrderStatus = "new" | "preparing" | "shipped" | "delivered" | "canceled";
export type MerchantApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type DataSourceMode = "mock" | "api";

export const ROLE_KEY = "bamoraUserRole";
export const MERCHANT_NAME_KEY = "bamoraMerchantName";
export const ADMIN_NAME_KEY = "bamoraAdminName";

export type MerchantProduct = {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  price: string;
  quantity: number;
  sizes: string[];
  colors: string[];
  images: string[];
};

export type MerchantProductInput = Omit<MerchantProduct, "id">;

export type MerchantOrder = {
  id: string;
  customer: string;
  status: MerchantOrderStatus;
  total: string;
  createdAt: string;
};

export type MerchantNotification = {
  id: string;
  title: string;
  detail: string;
};

export type MerchantStats = {
  newOrders: number;
  processingOrders: number;
  monthlyRevenue: string;
  conversionRate: string;
  topProduct: string;
};

export type MerchantDashboardData = {
  products: MerchantProduct[];
  orders: MerchantOrder[];
  notifications: MerchantNotification[];
  stats: MerchantStats;
};

export type MerchantRecord = {
  id: string;
  name: string;
  status: MerchantApprovalStatus;
  orders: number;
  revenue: string;
};

export type AdminProductRecord = {
  id: string;
  merchant: string;
  name: string;
  stock: number;
  price: string;
};

export type AdminOrderRecord = {
  id: string;
  merchant: string;
  customer: string;
  status: MerchantOrderStatus;
  total: string;
};

export type CategoryRecord = {
  id: string;
  nameAr: string;
  slug: string;
  icon: string;
  parentId: string | null;
};

export type PlatformStats = {
  merchantCount: number;
  dailyOrders: number;
  monthlyOrders: number;
  platformRevenue: string;
};

export type PlatformUserStatus = "active" | "suspended";
export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export type PlatformUserRecord = {
  id: string;
  name: string;
  email: string;
  role: Exclude<AppRole, "super-admin">;
  status: PlatformUserStatus;
  joinedAt: string;
};

export type SupportTicketRecord = {
  id: string;
  userName: string;
  subject: string;
  status: SupportTicketStatus;
  assignedTo: string | null;
  createdAt: string;
};

export type BroadcastRecord = {
  id: string;
  audience: "all-users" | "customers" | "merchants";
  title: string;
  body: string;
  sentAt: string;
};

export type GlobalOfferRecord = {
  id: string;
  title: string;
  code: string | null;
  discountText: string;
  createdAt: string;
};

export type AdminDashboardData = {
  merchants: MerchantRecord[];
  products: AdminProductRecord[];
  orders: AdminOrderRecord[];
  categories: CategoryRecord[];
  users: PlatformUserRecord[];
  supportTickets: SupportTicketRecord[];
  broadcasts: BroadcastRecord[];
  offers: GlobalOfferRecord[];
  stats: PlatformStats;
};

export type BroadcastMessageInput = {
  audience: "all-users" | "customers" | "merchants";
  title: string;
  body: string;
  couponCode?: string;
};

export type GlobalOfferInput = {
  title: string;
  code?: string;
  discountText: string;
};

export type CustomerProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  statusLabel: string;
  locale: "ar" | "en" | "he";
};

export type CustomerAddress = {
  id: string;
  label: string;
  line1: string;
  city: string;
  isDefault: boolean;
};

export type StorefrontProduct = {
  id: string;
  titleAr: string;
  price: string;
  detail: string;
  reviewCount: number;
  averageRating: number;
  category: string;
  featured: boolean;
  topSelling: boolean;
};

export type CustomerCartItem = {
  id: string;
  productId: string;
  quantity: number;
  size: string;
  color: string;
};

export type CustomerOrder = {
  id: string;
  productId: string;
  status: MerchantOrderStatus;
  total: string;
  createdAt: string;
};

export type CustomerNotification = {
  id: string;
  title: string;
  detail: string;
};

export type CustomerReviewInput = {
  productId: string;
  rating: number;
  comment: string;
};

export type CustomerAuthPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type CustomerLoginPayload = {
  email: string;
  password: string;
};

export type CustomerDashboardData = {
  profile: CustomerProfile;
  addresses: CustomerAddress[];
  products: StorefrontProduct[];
  favoriteIds: string[];
  cart: CustomerCartItem[];
  orders: CustomerOrder[];
  notifications: CustomerNotification[];
};

const MERCHANT_DASHBOARD_KEY = "bamoraMerchantDashboard";
const ADMIN_DASHBOARD_KEY = "bamoraAdminDashboard";
const CUSTOMER_DASHBOARD_KEY = "bamoraCustomerDashboard";
const CUSTOMER_AUTH_KEY = "bamoraCustomerAuth";
const ACCESS_TOKEN_KEY = "bamoraAccessToken";
const REFRESH_TOKEN_KEY = "bamoraRefreshToken";
const AUTH_USER_ID_KEY = "bamoraAuthUserId";
const AUTH_USER_ROLE_KEY = "bamoraAuthUserRole";

function readRuntimeEnv(name: string) {
  const maybeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return maybeProcess?.env?.[name];
}

const API_BASE_URL = readRuntimeEnv("NEXT_PUBLIC_BAMORA_API_URL") ?? "http://localhost:4001";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCurrentRole(): AppRole | null {
  if (!canUseStorage()) {
    return null;
  }

  const role = window.localStorage.getItem(ROLE_KEY);
  if (role === "customer" || role === "merchant" || role === "super-admin") {
    return role;
  }

  return null;
}

export function setCurrentRole(role: AppRole) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ROLE_KEY, role);
}

export function clearRoleSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ROLE_KEY);
}

export function hasRoleAccess(role: AppRole | null, scope: AppRole) {
  return role === scope;
}

export function requireRole(scope: AppRole) {
  const role = getCurrentRole();
  return hasRoleAccess(role, scope);
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseCsvField(value: string) {
  return parseList(value);
}

function buildMerchantDefaults(): MerchantDashboardData {
  return {
    products: [
      {
        id: "M-1021",
        name: "فستان سهرة مخملي",
        category: "نسائي",
        subCategory: "فساتين سهرة",
        price: "₪549 ILS",
        quantity: 33,
        sizes: ["S", "M", "L"],
        colors: ["أسود", "ذهبي"],
        images: ["front.jpg", "details.jpg", "back.jpg"],
      },
      {
        id: "M-2044",
        name: "حقيبة جلد فاخرة",
        category: "إكسسوارات",
        subCategory: "حقائب",
        price: "₪799 ILS",
        quantity: 15,
        sizes: ["One Size"],
        colors: ["بني", "أسود"],
        images: ["main.jpg", "strap.jpg"],
      },
    ],
    orders: [
      { id: "#BMR-90921", customer: "سارة الخطيب", status: "new", total: "₪1,099", createdAt: "منذ 5 دقائق" },
      { id: "#BMR-90918", customer: "ليان إبراهيم", status: "preparing", total: "₪799", createdAt: "منذ 30 دقيقة" },
      { id: "#BMR-90872", customer: "محمد سلام", status: "shipped", total: "₪2,100", createdAt: "أمس" },
      { id: "#BMR-90711", customer: "نور أحمد", status: "delivered", total: "₪620", createdAt: "قبل يومين" },
      { id: "#BMR-90504", customer: "ريم عوض", status: "canceled", total: "₪390", createdAt: "قبل 3 أيام" },
    ],
    notifications: [
      {
        id: "NT-1",
        title: "طلب جديد #BMR-90921",
        detail: "تم استلام طلب جديد من سارة الخطيب بقيمة ₪1,099",
      },
      {
        id: "NT-2",
        title: "تنبيه مخزون",
        detail: "مخزون حقيبة جلد فاخرة أقل من 20 قطعة",
      },
    ],
    stats: {
      newOrders: 24,
      processingOrders: 8,
      monthlyRevenue: "₪84,200",
      conversionRate: "6.4%",
      topProduct: "فستان سهرة مخملي",
    },
  };
}

function buildAdminDefaults(): AdminDashboardData {
  return {
    merchants: [
      { id: "MER-101", name: "Atelier Noir", status: "approved", orders: 110, revenue: "₪182,000" },
      { id: "MER-102", name: "Golden Stitch", status: "pending", orders: 0, revenue: "₪0" },
      { id: "MER-103", name: "Velvet Home", status: "suspended", orders: 44, revenue: "₪59,200" },
      { id: "MER-104", name: "Luna Kids", status: "rejected", orders: 0, revenue: "₪0" },
    ],
    products: [
      { id: "PR-2201", merchant: "Atelier Noir", name: "فستان سهرة حريري", stock: 24, price: "₪620" },
      { id: "PR-2240", merchant: "Velvet Home", name: "طقم مناشف سبا", stock: 55, price: "₪180" },
      { id: "PR-2304", merchant: "Golden Stitch", name: "بدلة رجالية كحلية", stock: 0, price: "₪1,200" },
    ],
    orders: [
      { id: "#BMR-91110", merchant: "Atelier Noir", customer: "سارة الخطيب", status: "new", total: "₪1,099" },
      { id: "#BMR-91044", merchant: "Velvet Home", customer: "ريم عوض", status: "preparing", total: "₪390" },
      { id: "#BMR-90981", merchant: "Atelier Noir", customer: "ليلى عمر", status: "shipped", total: "₪2,440" },
      { id: "#BMR-90862", merchant: "Golden Stitch", customer: "نور سالم", status: "delivered", total: "₪780" },
      { id: "#BMR-90701", merchant: "Velvet Home", customer: "آية حمد", status: "canceled", total: "₪180" },
    ],
    categories: [
      { id: "CAT-1", nameAr: "نسائي", slug: "women", icon: "👗", parentId: null },
      { id: "CAT-2", nameAr: "رجالي", slug: "men", icon: "🤵", parentId: null },
      { id: "CAT-3", nameAr: "فساتين سهرة", slug: "evening-dresses", icon: "✨", parentId: "CAT-1" },
    ],
    users: [
      { id: "USR-11", name: "عميل BAMORA", email: "customer@bamora.com", role: "customer", status: "active", joinedAt: "2026-04-12" },
      { id: "USR-12", name: "BAMORA Demo Merchant", email: "merchant@bamora.com", role: "merchant", status: "active", joinedAt: "2026-03-08" },
      { id: "USR-13", name: "Luna Store", email: "luna@bamora.com", role: "merchant", status: "suspended", joinedAt: "2026-02-17" },
    ],
    supportTickets: [
      {
        id: "SUP-1",
        userName: "سارة الخطيب",
        subject: "تأخر في تحديث حالة الطلب #BMR-91110",
        status: "open",
        assignedTo: null,
        createdAt: "2026-07-27 11:22",
      },
      {
        id: "SUP-2",
        userName: "Golden Stitch",
        subject: "مشكلة رفع صور منتج جديد",
        status: "in_progress",
        assignedTo: "فريق الدعم",
        createdAt: "2026-07-26 09:05",
      },
    ],
    broadcasts: [
      {
        id: "BC-1",
        audience: "all-users",
        title: "تحديث منصة BAMORA",
        body: "تم تحسين سرعة التصفح والتتبع لجميع المستخدمين.",
        sentAt: "2026-07-20",
      },
    ],
    offers: [
      {
        id: "OFF-1",
        title: "عرض الصيف",
        code: "BAMORA10",
        discountText: "خصم 10% على المنتجات المختارة",
        createdAt: "2026-07-14",
      },
    ],
    stats: {
      merchantCount: 128,
      dailyOrders: 342,
      monthlyOrders: 7940,
      platformRevenue: "₪1,920,300",
    },
  };
}

function buildCustomerDefaults(): CustomerDashboardData {
  return {
    profile: {
      id: "CUS-1",
      fullName: "عميل BAMORA",
      email: "customer@bamora.com",
      phone: "+972 59-000-0000",
      statusLabel: "عضو ذهبي",
      locale: "ar",
    },
    addresses: [
      {
        id: "ADDR-1",
        label: "المنزل",
        line1: "شارع النجاح 15، الطابق 3",
        city: "القدس",
        isDefault: true,
      },
    ],
    products: [
      { id: "hero-bag", titleAr: "حقيبة جلد فاخرة", price: "₪799 ILS", detail: "تصميم جلد فاخر مع لمسات ذهبية لكل المناسبات.", reviewCount: 12, averageRating: 4.8, category: "حقائب", featured: true, topSelling: false },
      { id: "hero-dress", titleAr: "فستان سهرة أسود", price: "₪549 ILS", detail: "قصة أنيقة تبرزك في سهرة لا تُنسى.", reviewCount: 5, averageRating: 4.5, category: "فساتين", featured: true, topSelling: false },
      { id: "hero-watch", titleAr: "ساعة كلاسيكية", price: "₪1,250 ILS", detail: "تصميم دقيق ولمسات ذهبية تضفي لمسة فاخرة.", reviewCount: 18, averageRating: 4.9, category: "إكسسوارات", featured: true, topSelling: false },
      { id: "fav-bag", titleAr: "حقيبة جلد فاخرة", price: "₪799 ILS", detail: "تصميم أنيق لكل يوم ومناسبة.", reviewCount: 8, averageRating: 4.6, category: "حقائب", featured: false, topSelling: false },
      { id: "fav-dress", titleAr: "فستان سهرة أسود", price: "₪549 ILS", detail: "فستان ناعم لمظهر أنيق وراقي.", reviewCount: 16, averageRating: 4.9, category: "فساتين", featured: false, topSelling: false },
      { id: "fav-watch", titleAr: "ساعة كلاسيكية", price: "₪1,250 ILS", detail: "ساعة أنيقة تضيف لمسة فخمة لكل إطلالة.", reviewCount: 4, averageRating: 4.5, category: "إكسسوارات", featured: false, topSelling: false },
      { id: "fav-perfume", titleAr: "عطر ذهبي", price: "₪450 ILS", detail: "رائحة دافئة ومميزة بعبق العود والعود.", reviewCount: 21, averageRating: 5.0, category: "عطور", featured: false, topSelling: false },
      { id: "best-seller-dress", titleAr: "فستان سهرة حريري", price: "₪620 ILS", detail: "فستان حريري متدفق لجاذبية خاصة في كل مناسبة.", reviewCount: 24, averageRating: 4.9, category: "فساتين", featured: false, topSelling: true },
      { id: "best-seller-bag", titleAr: "حقيبة كتف مميزة", price: "₪520 ILS", detail: "حقيبة بارزة تتماشى مع إطلالات السهرة.", reviewCount: 30, averageRating: 4.8, category: "حقائب", featured: false, topSelling: true },
      { id: "best-seller-perfume", titleAr: "عطر العنبر الشرقي", price: "₪390 ILS", detail: "رائحة دافئة تعود إليها الزبائن بانتظام.", reviewCount: 28, averageRating: 4.9, category: "عطور", featured: false, topSelling: true },
      { id: "mirror-women-1", titleAr: "فستان مخملي ملكي", price: "₪680 ILS", detail: "قصة أنثوية مع خامة مريحة للمناسبات المسائية.", reviewCount: 14, averageRating: 4.8, category: "فساتين", featured: false, topSelling: false },
      { id: "mirror-women-2", titleAr: "فستان حرير مزخرف", price: "₪590 ILS", detail: "تفاصيل ذهبية تضيف حضورًا فاخرًا في كل إطلالة.", reviewCount: 9, averageRating: 4.6, category: "فساتين", featured: false, topSelling: false },
      { id: "mirror-men-1", titleAr: "بليزر كحلي رسمي", price: "₪720 ILS", detail: "مقاس متوازن وخامة ممتازة للاجتماعات والمناسبات.", reviewCount: 11, averageRating: 4.7, category: "رجالي", featured: false, topSelling: false },
      { id: "mirror-men-2", titleAr: "بدلة رمادية عصرية", price: "₪980 ILS", detail: "بدلة أنيقة بلمسة حديثة وتفصيل مريح طوال اليوم.", reviewCount: 17, averageRating: 4.9, category: "رجالي", featured: false, topSelling: false },
      { id: "mirror-acc-1", titleAr: "حقيبة كتف جلدية", price: "₪540 ILS", detail: "حقيبة راقية تناسب الإطلالات اليومية والسهرة.", reviewCount: 13, averageRating: 4.8, category: "إكسسوارات", featured: false, topSelling: false },
      { id: "mirror-acc-2", titleAr: "ساعة ذهبي مطفي", price: "₪1,080 ILS", detail: "ساعة كلاسيكية بإطار أنيق تضيف فخامة لإطلالتك.", reviewCount: 19, averageRating: 4.9, category: "إكسسوارات", featured: false, topSelling: false },
      { id: "mirror-fr-1", titleAr: "عطر العنبر الملكي", price: "₪460 ILS", detail: "ثبات طويل مع توازن دافئ بين العود والعنبر.", reviewCount: 22, averageRating: 4.9, category: "عطور", featured: false, topSelling: false },
      { id: "mirror-fr-2", titleAr: "عطر زهري مسائي", price: "₪390 ILS", detail: "مزيج ناعم يناسب السهرات والمناسبات الخاصة.", reviewCount: 10, averageRating: 4.7, category: "عطور", featured: false, topSelling: false },
    ],
    favoriteIds: ["fav-bag", "fav-dress", "fav-watch", "fav-perfume"],
    cart: [],
    orders: [
      { id: "#1254", productId: "hero-bag", status: "shipped", total: "₪799 ILS", createdAt: "24 مايو 2024" },
    ],
    notifications: [
      { id: "CN-1", title: "تم شحن طلبك", detail: "طلبك رقم #1254 في طريقه إليك منذ 10 دقائق" },
      { id: "CN-2", title: "عرض خاص لك!", detail: "خصم 20% على جميع الموديلز منذ ساعتين" },
      { id: "CN-3", title: "الطلب تم تأكيده", detail: "تم تأكيد طلبك رقم #1254 منذ 5 ساعات" },
    ],
  };
}

function readStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredString(key: string) {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStoredString(key: string, value: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeStoredString(key: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function apiUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${normalizeBaseUrl(API_BASE_URL)}${path.startsWith("/") ? "" : "/"}${path}`;
}

type ApiRequestOptions = {
  roleHeader?: "customer" | "merchant" | "super-admin";
  skipAuth?: boolean;
};

async function apiRequest<T>(path: string, init: RequestInit = {}, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  headers.set("accept", "application/json");

  if (!headers.has("content-type") && init.body != null) {
    headers.set("content-type", "application/json");
  }

  if (options.roleHeader) {
    headers.set("x-role", options.roleHeader);
  }

  const token = readStoredString(ACCESS_TOKEN_KEY);
  if (!options.skipAuth && token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message) && payload.message[0]) {
        message = payload.message[0];
      } else if (typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // Preserve default error message when server does not return JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeOrderStatus(status: string): MerchantOrderStatus {
  const value = status.trim().toUpperCase();
  if (value === "PENDING") {
    return "new";
  }

  if (value === "CONFIRMED" || value === "PROCESSING" || value === "PACKED") {
    return "preparing";
  }

  if (value === "SHIPPED" || value === "IN_TRANSIT") {
    return "shipped";
  }

  if (value === "DELIVERED" || value === "RETURNED") {
    return "delivered";
  }

  return "canceled";
}

function toApiOrderStatus(status: MerchantOrderStatus) {
  if (status === "new") {
    return "pending" as const;
  }

  if (status === "preparing") {
    return "processing" as const;
  }

  return status;
}

function parseCurrencyNumber(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  return Number(normalized || "0");
}

function formatIls(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(amount)) {
    return "₪0 ILS";
  }

  return `₪${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ILS`;
}

function saveAuthSession(tokens: {
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: "customer" | "merchant" | "super-admin" };
}) {
  writeStoredString(ACCESS_TOKEN_KEY, tokens.accessToken);
  writeStoredString(REFRESH_TOKEN_KEY, tokens.refreshToken);
  writeStoredString(AUTH_USER_ID_KEY, tokens.user.id);
  writeStoredString(AUTH_USER_ROLE_KEY, tokens.user.role);
}

function getStoredUserId() {
  return readStoredString(AUTH_USER_ID_KEY) ?? undefined;
}

function mapProfile(input: {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  locale?: string | null;
}): CustomerProfile {
  const locale = input.locale === "en" || input.locale === "he" ? input.locale : "ar";
  return {
    id: input.id,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? "",
    statusLabel: "عضو BAMORA",
    locale,
  };
}

function buildId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export type MerchantRepository = {
  getDashboard(): Promise<MerchantDashboardData>;
  addProduct(input: MerchantProductInput): Promise<MerchantProduct>;
  updateProduct(id: string, input: MerchantProductInput): Promise<MerchantProduct | null>;
  deleteProduct(id: string): Promise<boolean>;
  updateOrderStatus(orderId: string, status: MerchantOrderStatus): Promise<MerchantOrder | null>;
};

export type AdminRepository = {
  getDashboard(): Promise<AdminDashboardData>;
  updateMerchantStatus(id: string, status: MerchantApprovalStatus): Promise<MerchantRecord | null>;
  deleteMerchant(id: string): Promise<boolean>;
  deleteProduct(id: string): Promise<boolean>;
  updateOrderStatus(orderId: string, status: MerchantOrderStatus): Promise<AdminOrderRecord | null>;
  upsertCategory(input: Omit<CategoryRecord, "id"> & { id?: string }): Promise<CategoryRecord>;
  deleteCategory(id: string): Promise<boolean>;
  createGlobalOffer(input: GlobalOfferInput): Promise<GlobalOfferRecord>;
  sendBroadcast(input: BroadcastMessageInput): Promise<BroadcastRecord>;
  updateUserStatus(id: string, status: PlatformUserStatus): Promise<PlatformUserRecord | null>;
  deleteUser(id: string): Promise<boolean>;
  assignSupportTicket(id: string, assignedTo: string): Promise<SupportTicketRecord | null>;
  updateSupportTicketStatus(id: string, status: SupportTicketStatus): Promise<SupportTicketRecord | null>;
};

export type CustomerRepository = {
  getDashboard(): Promise<CustomerDashboardData>;
  signup(payload: CustomerAuthPayload): Promise<CustomerProfile>;
  login(payload: CustomerLoginPayload): Promise<CustomerProfile>;
  updateProfile(patch: Partial<Omit<CustomerProfile, "id">>): Promise<CustomerProfile>;
  upsertAddress(input: Omit<CustomerAddress, "id"> & { id?: string }): Promise<CustomerAddress>;
  toggleFavorite(productId: string): Promise<string[]>;
  addToCart(input: Omit<CustomerCartItem, "id"> & { id?: string }): Promise<CustomerCartItem>;
  removeFromCart(cartItemId: string): Promise<boolean>;
  checkout(): Promise<CustomerOrder | null>;
  submitReview(input: CustomerReviewInput): Promise<StorefrontProduct | null>;
};

function getMerchantDataset() {
  const fallback = buildMerchantDefaults();
  const data = readStorage(MERCHANT_DASHBOARD_KEY, fallback);
  if (!canUseStorage()) {
    return data;
  }

  if (!window.localStorage.getItem(MERCHANT_DASHBOARD_KEY)) {
    writeStorage(MERCHANT_DASHBOARD_KEY, fallback);
  }

  return data;
}

function setMerchantDataset(data: MerchantDashboardData) {
  writeStorage(MERCHANT_DASHBOARD_KEY, data);
}

function getAdminDataset() {
  const fallback = buildAdminDefaults();
  const data = readStorage(ADMIN_DASHBOARD_KEY, fallback);
  if (!canUseStorage()) {
    return data;
  }

  if (!window.localStorage.getItem(ADMIN_DASHBOARD_KEY)) {
    writeStorage(ADMIN_DASHBOARD_KEY, fallback);
  }

  return data;
}

function setAdminDataset(data: AdminDashboardData) {
  writeStorage(ADMIN_DASHBOARD_KEY, data);
}

function getCustomerDataset() {
  const fallback = buildCustomerDefaults();
  const data = readStorage(CUSTOMER_DASHBOARD_KEY, fallback);
  if (!canUseStorage()) {
    return data;
  }

  if (!window.localStorage.getItem(CUSTOMER_DASHBOARD_KEY)) {
    writeStorage(CUSTOMER_DASHBOARD_KEY, fallback);
  }

  return data;
}

function setCustomerDataset(data: CustomerDashboardData) {
  writeStorage(CUSTOMER_DASHBOARD_KEY, data);
}

function createMockMerchantRepository(): MerchantRepository {
  return {
    async getDashboard() {
      return getMerchantDataset();
    },
    async addProduct(input) {
      const dashboard = getMerchantDataset();
      const product: MerchantProduct = { id: buildId("M"), ...input };
      dashboard.products = [product, ...dashboard.products];
      setMerchantDataset(dashboard);
      return product;
    },
    async updateProduct(id, input) {
      const dashboard = getMerchantDataset();
      const index = dashboard.products.findIndex((product) => product.id === id);
      if (index === -1) {
        return null;
      }

      dashboard.products[index] = { id, ...input };
      setMerchantDataset(dashboard);
      return dashboard.products[index];
    },
    async deleteProduct(id) {
      const dashboard = getMerchantDataset();
      const before = dashboard.products.length;
      dashboard.products = dashboard.products.filter((product) => product.id !== id);
      setMerchantDataset(dashboard);
      return dashboard.products.length !== before;
    },
    async updateOrderStatus(orderId, status) {
      const dashboard = getMerchantDataset();
      const order = dashboard.orders.find((item) => item.id === orderId);
      if (!order) {
        return null;
      }

      order.status = status;
      setMerchantDataset(dashboard);
      return order;
    },
  };
}

function createMockAdminRepository(): AdminRepository {
  return {
    async getDashboard() {
      return getAdminDataset();
    },
    async updateMerchantStatus(id, status) {
      const dashboard = getAdminDataset();
      const target = dashboard.merchants.find((merchant) => merchant.id === id);
      if (!target) {
        return null;
      }

      target.status = status;
      setAdminDataset(dashboard);
      return target;
    },
    async deleteMerchant(id) {
      const dashboard = getAdminDataset();
      const before = dashboard.merchants.length;
      dashboard.merchants = dashboard.merchants.filter((merchant) => merchant.id !== id);
      setAdminDataset(dashboard);
      return before !== dashboard.merchants.length;
    },
    async deleteProduct(id) {
      const dashboard = getAdminDataset();
      const before = dashboard.products.length;
      dashboard.products = dashboard.products.filter((product) => product.id !== id);
      setAdminDataset(dashboard);
      return before !== dashboard.products.length;
    },
    async updateOrderStatus(orderId, status) {
      const dashboard = getAdminDataset();
      const target = dashboard.orders.find((order) => order.id === orderId);
      if (!target) {
        return null;
      }

      target.status = status;
      setAdminDataset(dashboard);
      return target;
    },
    async upsertCategory(input) {
      const dashboard = getAdminDataset();
      if (input.id) {
        const existing = dashboard.categories.find((item) => item.id === input.id);
        if (existing) {
          existing.nameAr = input.nameAr;
          existing.slug = input.slug;
          existing.icon = input.icon;
          existing.parentId = input.parentId;
          setAdminDataset(dashboard);
          return existing;
        }
      }

      const created: CategoryRecord = {
        id: buildId("CAT"),
        nameAr: input.nameAr,
        slug: input.slug,
        icon: input.icon,
        parentId: input.parentId,
      };
      dashboard.categories = [created, ...dashboard.categories];
      setAdminDataset(dashboard);
      return created;
    },
    async deleteCategory(id) {
      const dashboard = getAdminDataset();
      const before = dashboard.categories.length;
      dashboard.categories = dashboard.categories.filter((category) => category.id !== id);
      setAdminDataset(dashboard);
      return before !== dashboard.categories.length;
    },
    async createGlobalOffer(input) {
      const dashboard = getAdminDataset();
      const offer: GlobalOfferRecord = {
        id: buildId("OFF"),
        title: input.title,
        code: input.code ?? null,
        discountText: input.discountText,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      dashboard.offers = [offer, ...dashboard.offers];
      setAdminDataset(dashboard);
      return offer;
    },
    async sendBroadcast(input) {
      const dashboard = getAdminDataset();
      const broadcast: BroadcastRecord = {
        id: buildId("BC"),
        audience: input.audience,
        title: input.title,
        body: input.body,
        sentAt: new Date().toISOString().slice(0, 10),
      };
      dashboard.broadcasts = [broadcast, ...dashboard.broadcasts];
      setAdminDataset(dashboard);
      return broadcast;
    },
    async updateUserStatus(id, status) {
      const dashboard = getAdminDataset();
      const target = dashboard.users.find((user) => user.id === id);
      if (!target) {
        return null;
      }

      target.status = status;
      setAdminDataset(dashboard);
      return target;
    },
    async deleteUser(id) {
      const dashboard = getAdminDataset();
      const before = dashboard.users.length;
      dashboard.users = dashboard.users.filter((user) => user.id !== id);
      setAdminDataset(dashboard);
      return before !== dashboard.users.length;
    },
    async assignSupportTicket(id, assignedTo) {
      const dashboard = getAdminDataset();
      const target = dashboard.supportTickets.find((ticket) => ticket.id === id);
      if (!target) {
        return null;
      }

      target.assignedTo = assignedTo;
      if (target.status === "open") {
        target.status = "in_progress";
      }

      setAdminDataset(dashboard);
      return target;
    },
    async updateSupportTicketStatus(id, status) {
      const dashboard = getAdminDataset();
      const target = dashboard.supportTickets.find((ticket) => ticket.id === id);
      if (!target) {
        return null;
      }

      target.status = status;
      setAdminDataset(dashboard);
      return target;
    },
  };
}

function createMockCustomerRepository(): CustomerRepository {
  return {
    async getDashboard() {
      return getCustomerDataset();
    },
    async signup(payload) {
      const dashboard = getCustomerDataset();
      dashboard.profile.fullName = payload.fullName || dashboard.profile.fullName;
      dashboard.profile.email = payload.email;
      setCustomerDataset(dashboard);
      writeStorage(CUSTOMER_AUTH_KEY, { email: payload.email, password: payload.password });
      return dashboard.profile;
    },
    async login(payload) {
      const dashboard = getCustomerDataset();
      const auth = readStorage<{ email: string; password: string } | null>(CUSTOMER_AUTH_KEY, null);
      if (!auth) {
        throw new Error("لا يوجد حساب مسجل بعد. قم بإنشاء حساب أولاً.");
      }

      if (auth.email !== payload.email || auth.password !== payload.password) {
        throw new Error("بيانات تسجيل الدخول غير صحيحة.");
      }

      return dashboard.profile;
    },
    async updateProfile(patch) {
      const dashboard = getCustomerDataset();
      dashboard.profile = { ...dashboard.profile, ...patch };
      setCustomerDataset(dashboard);
      return dashboard.profile;
    },
    async upsertAddress(input) {
      const dashboard = getCustomerDataset();
      if (input.id) {
        const target = dashboard.addresses.find((address) => address.id === input.id);
        if (target) {
          target.label = input.label;
          target.line1 = input.line1;
          target.city = input.city;
          target.isDefault = input.isDefault;
          setCustomerDataset(dashboard);
          return target;
        }
      }

      const created: CustomerAddress = {
        id: buildId("ADDR"),
        label: input.label,
        line1: input.line1,
        city: input.city,
        isDefault: input.isDefault,
      };
      dashboard.addresses = [created, ...dashboard.addresses];
      setCustomerDataset(dashboard);
      return created;
    },
    async toggleFavorite(productId) {
      const dashboard = getCustomerDataset();
      if (dashboard.favoriteIds.includes(productId)) {
        dashboard.favoriteIds = dashboard.favoriteIds.filter((id) => id !== productId);
      } else {
        dashboard.favoriteIds = [productId, ...dashboard.favoriteIds];
      }

      setCustomerDataset(dashboard);
      return dashboard.favoriteIds;
    },
    async addToCart(input) {
      const dashboard = getCustomerDataset();
      const existing = dashboard.cart.find(
        (item) => item.productId === input.productId && item.size === input.size && item.color === input.color,
      );
      if (existing) {
        existing.quantity += input.quantity;
        setCustomerDataset(dashboard);
        return existing;
      }

      const created: CustomerCartItem = {
        id: input.id ?? buildId("CART"),
        productId: input.productId,
        quantity: input.quantity,
        size: input.size,
        color: input.color,
      };
      dashboard.cart = [created, ...dashboard.cart];
      setCustomerDataset(dashboard);
      return created;
    },
    async removeFromCart(cartItemId) {
      const dashboard = getCustomerDataset();
      const before = dashboard.cart.length;
      dashboard.cart = dashboard.cart.filter((item) => item.id !== cartItemId);
      setCustomerDataset(dashboard);
      return before !== dashboard.cart.length;
    },
    async checkout() {
      const dashboard = getCustomerDataset();
      const firstCart = dashboard.cart[0];
      if (!firstCart) {
        return null;
      }

      const product = dashboard.products.find((item) => item.id === firstCart.productId);
      const created: CustomerOrder = {
        id: `#ORD-${Date.now()}`,
        productId: firstCart.productId,
        status: "new",
        total: product?.price ?? "₪0 ILS",
        createdAt: "الآن",
      };
      dashboard.orders = [created, ...dashboard.orders];
      dashboard.cart = [];
      dashboard.notifications = [
        { id: buildId("CN"), title: "تم استلام طلب جديد", detail: `رقم الطلب ${created.id}` },
        ...dashboard.notifications,
      ];
      setCustomerDataset(dashboard);
      return created;
    },
    async submitReview(input) {
      const dashboard = getCustomerDataset();
      const product = dashboard.products.find((item) => item.id === input.productId);
      if (!product) {
        return null;
      }

      const nextCount = product.reviewCount + 1;
      product.averageRating = Number(((product.averageRating * product.reviewCount + input.rating) / nextCount).toFixed(1));
      product.reviewCount = nextCount;
      setCustomerDataset(dashboard);
      return product;
    },
  };
}

function createApiMerchantRepository(): MerchantRepository {
  const resolveMerchantId = async () => {
    const cached = readStoredString("bamoraMerchantId");
    if (cached) {
      return cached;
    }

    const dashboard = await apiRequest<{ merchantId: string }>(platformApiContracts.merchant.dashboard, undefined, {
      roleHeader: "merchant",
    });
    writeStoredString("bamoraMerchantId", dashboard.merchantId);
    return dashboard.merchantId;
  };

  const withMerchantId = async (path: string) => {
    const merchantId = await resolveMerchantId();
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}merchantId=${encodeURIComponent(merchantId)}`;
  };

  const mapMerchantProduct = (product: {
    id: string;
    titleAr: string;
    variants: Array<{ price: string | number; size: string; color: string; inventory?: { quantity: number } | null }>;
    images: Array<{ url: string }>;
  }): MerchantProduct => {
    const lead = product.variants[0];
    const quantity = product.variants.reduce((sum, variant) => sum + (variant.inventory?.quantity ?? 0), 0);
    return {
      id: product.id,
      name: product.titleAr,
      category: "عام",
      subCategory: "-",
      price: formatIls(lead?.price ?? 0),
      quantity,
      sizes: Array.from(new Set(product.variants.map((variant) => variant.size))),
      colors: Array.from(new Set(product.variants.map((variant) => variant.color))),
      images: product.images.map((image) => image.url),
    };
  };

  const mapMerchantOrder = (subOrder: {
    id: string;
    status: string;
    subtotal: string | number;
    createdAt: string;
    order: { orderNumber: string; customer: { user: { email: string } } };
  }): MerchantOrder => ({
    id: subOrder.order.orderNumber || subOrder.id,
    customer: subOrder.order.customer.user.email,
    status: normalizeOrderStatus(subOrder.status),
    total: formatIls(subOrder.subtotal),
    createdAt: new Date(subOrder.createdAt).toLocaleDateString("ar-EG"),
  });

  return {
    async getDashboard() {
      const endpoint = await withMerchantId(platformApiContracts.merchant.dashboard);
      const payload = await apiRequest<{
        merchantId: string;
        products: Array<{
          id: string;
          titleAr: string;
          variants: Array<{ price: string | number; size: string; color: string; inventory?: { quantity: number } | null }>;
          images: Array<{ url: string }>;
        }>;
        orders: Array<{
          id: string;
          status: string;
          subtotal: string | number;
          createdAt: string;
          order: { orderNumber: string; customer: { user: { email: string } } };
        }>;
        inventory?: { alerts?: Array<{ id: string; quantity: number; threshold: number }>; lowStock?: Array<{ id: string; quantity: number }> };
        stats?: { newOrders?: number; revenue?: string | number };
      }>(endpoint, undefined, { roleHeader: "merchant" });

      writeStoredString("bamoraMerchantId", payload.merchantId);
      const products = payload.products.map(mapMerchantProduct);
      const orders = payload.orders.map(mapMerchantOrder);
      const alerts = payload.inventory?.alerts ?? [];
      const notifications: MerchantNotification[] = alerts.slice(0, 3).map((alert) => ({
        id: alert.id,
        title: "تنبيه مخزون",
        detail: `الكمية المتبقية ${alert.quantity} أقل من الحد ${alert.threshold}`,
      }));

      const stats: MerchantStats = {
        newOrders: orders.filter((order) => order.status === "new").length,
        processingOrders: orders.filter((order) => order.status === "preparing").length,
        monthlyRevenue: formatIls(payload.stats?.revenue ?? 0),
        conversionRate: "0%",
        topProduct: products[0]?.name ?? "-",
      };

      return {
        products,
        orders,
        notifications,
        stats,
      };
    },
    async addProduct(input) {
      const merchantId = await resolveMerchantId();
      const created = await apiRequest<{
        id: string;
        titleAr: string;
        variants: Array<{ price: string | number; size: string; color: string; inventory?: { quantity: number } | null }>;
        images: Array<{ url: string }>;
      }>(
        platformApiContracts.merchant.products,
        {
          method: "POST",
          body: JSON.stringify({
            merchantId,
            name: input.name,
            stock: input.quantity,
            price: String(parseCurrencyNumber(input.price)),
            images: input.images,
            sizes: input.sizes,
            colors: input.colors,
          }),
        },
        { roleHeader: "merchant" },
      );

      return mapMerchantProduct(created);
    },
    async updateProduct(id, input) {
      const merchantId = await resolveMerchantId();
      const updated = await apiRequest<{
        id: string;
        titleAr: string;
        variants: Array<{ price: string | number; size: string; color: string; inventory?: { quantity: number } | null }>;
        images: Array<{ url: string }>;
      }>(
        `${platformApiContracts.merchant.products}/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            merchantId,
            name: input.name,
            stock: input.quantity,
            price: String(parseCurrencyNumber(input.price)),
            images: input.images,
            sizes: input.sizes,
            colors: input.colors,
          }),
        },
        { roleHeader: "merchant" },
      );

      return mapMerchantProduct(updated);
    },
    async deleteProduct(id) {
      const endpoint = await withMerchantId(`${platformApiContracts.merchant.products}/${id}`);
      const response = await apiRequest<{ deleted: boolean }>(
        endpoint,
        { method: "DELETE" },
        { roleHeader: "merchant" },
      );
      return Boolean(response.deleted);
    },
    async updateOrderStatus(orderId, status) {
      const endpoint = await withMerchantId(`${platformApiContracts.merchant.orders}/${orderId}/status`);
      const updated = await apiRequest<{ id: string; status: string; total?: string | number }>(
        endpoint,
        {
          method: "PATCH",
          body: JSON.stringify({ status: toApiOrderStatus(status) }),
        },
        { roleHeader: "merchant" },
      );

      return {
        id: updated.id,
        customer: "-",
        status: normalizeOrderStatus(updated.status),
        total: formatIls(updated.total ?? 0),
        createdAt: new Date().toLocaleDateString("ar-EG"),
      };
    },
  };
}

function createApiAdminRepository(): AdminRepository {
  const mapMerchant = (merchant: { id: string; user?: { email: string }; status: string }): MerchantRecord => ({
    id: merchant.id,
    name: merchant.user?.email ?? merchant.id,
    status:
      merchant.status === "APPROVED"
        ? "approved"
        : merchant.status === "SUSPENDED"
          ? "suspended"
          : "pending",
    orders: 0,
    revenue: "₪0",
  });

  const mapAdminProduct = (product: {
    id: string;
    titleAr: string;
    merchant?: { user?: { email: string } };
    variants: Array<{ price: string | number; inventory?: { quantity: number } | null }>;
  }): AdminProductRecord => ({
    id: product.id,
    merchant: product.merchant?.user?.email ?? "-",
    name: product.titleAr,
    stock: product.variants.reduce((sum, variant) => sum + (variant.inventory?.quantity ?? 0), 0),
    price: formatIls(product.variants[0]?.price ?? 0),
  });

  const mapAdminOrder = (order: {
    id: string;
    orderNumber?: string;
    status: string;
    total: string | number;
    customer?: { user?: { email: string } };
    subOrders?: Array<{ merchant?: { user?: { email: string } } }>;
  }): AdminOrderRecord => ({
    id: order.orderNumber ?? order.id,
    merchant: order.subOrders?.[0]?.merchant?.user?.email ?? "-",
    customer: order.customer?.user?.email ?? "-",
    status: normalizeOrderStatus(order.status),
    total: formatIls(order.total),
  });

  const mapCategory = (category: { id: string; nameAr: string; slug: string; parentId?: string | null }): CategoryRecord => ({
    id: category.id,
    nameAr: category.nameAr,
    slug: category.slug,
    icon: "🛍️",
    parentId: category.parentId ?? null,
  });

  const mapUser = (user: { id: string; email: string; role: string; status: string; createdAt: string }): PlatformUserRecord => ({
    id: user.id,
    name: user.email.split("@")[0],
    email: user.email,
    role: user.role === "MERCHANT" ? "merchant" : "customer",
    status: user.status === "SUSPENDED" ? "suspended" : "active",
    joinedAt: user.createdAt.slice(0, 10),
  });

  return {
    async getDashboard() {
      const [dashboard, supportTickets] = await Promise.all([
        apiRequest<{
          merchants: Array<{ id: string; status: string; user?: { email: string } }>;
          products: Array<{
            id: string;
            titleAr: string;
            merchant?: { user?: { email: string } };
            variants: Array<{ price: string | number; inventory?: { quantity: number } | null }>;
          }>;
          orders: Array<{
            id: string;
            orderNumber?: string;
            status: string;
            total: string | number;
            customer?: { user?: { email: string } };
            subOrders?: Array<{ merchant?: { user?: { email: string } } }>;
          }>;
          categories: Array<{ id: string; nameAr: string; slug: string; parentId?: string | null }>;
          users: Array<{ id: string; email: string; role: string; status: string; createdAt: string }>;
          stats: { merchantCount: number; orderCount: number; productCount: number; userCount: number; platformRevenue: string | number };
        }>(platformApiContracts.admin.dashboard, undefined, { roleHeader: "super-admin" }),
        apiRequest<Array<{ id: string; title: string; body: string; createdAt: string }>>(
          platformApiContracts.admin.supportTickets,
          undefined,
          { roleHeader: "super-admin" },
        ),
      ]);

      return {
        merchants: dashboard.merchants.map(mapMerchant),
        products: dashboard.products.map(mapAdminProduct),
        orders: dashboard.orders.map(mapAdminOrder),
        categories: dashboard.categories.map(mapCategory),
        users: dashboard.users.map(mapUser),
        supportTickets: supportTickets.map((ticket) => ({
          id: ticket.id,
          userName: ticket.title || "User",
          subject: ticket.body,
          status: ticket.body.includes("resolved") ? "resolved" : ticket.body.includes("in_progress") ? "in_progress" : "open",
          assignedTo: ticket.body.includes("Assigned to") ? ticket.body.replace("Assigned to", "").trim() : null,
          createdAt: new Date(ticket.createdAt).toLocaleString("ar-EG"),
        })),
        broadcasts: readStorage<BroadcastRecord[]>("bamoraAdminBroadcastHistory", []),
        offers: readStorage<GlobalOfferRecord[]>("bamoraAdminOfferHistory", []),
        stats: {
          merchantCount: dashboard.stats.merchantCount,
          dailyOrders: dashboard.stats.orderCount,
          monthlyOrders: dashboard.stats.orderCount,
          platformRevenue: formatIls(dashboard.stats.platformRevenue),
        },
      };
    },
    async updateMerchantStatus(id, status) {
      const normalizedStatus = status === "rejected" ? "suspended" : status;
      const updated = await apiRequest<{ id: string; status: string; user?: { email: string } }>(
        `${platformApiContracts.admin.merchants}/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: normalizedStatus }),
        },
        { roleHeader: "super-admin" },
      );
      return mapMerchant(updated);
    },
    async deleteMerchant(id) {
      const response = await apiRequest<{ deleted: boolean }>(
        `${platformApiContracts.admin.merchants}/${id}`,
        { method: "DELETE" },
        { roleHeader: "super-admin" },
      );
      return Boolean(response.deleted);
    },
    async deleteProduct(id) {
      const response = await apiRequest<{ deleted: boolean }>(
        `${platformApiContracts.admin.products}/${id}`,
        { method: "DELETE" },
        { roleHeader: "super-admin" },
      );
      return Boolean(response.deleted);
    },
    async updateOrderStatus(orderId, status) {
      const updated = await apiRequest<{ id: string; status: string; total: string | number }>(
        `${platformApiContracts.admin.orders}/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: toApiOrderStatus(status) }),
        },
        { roleHeader: "super-admin" },
      );

      return {
        id: updated.id,
        merchant: "-",
        customer: "-",
        status: normalizeOrderStatus(updated.status),
        total: formatIls(updated.total),
      };
    },
    async upsertCategory(input) {
      const payload = await apiRequest<{ id: string; nameAr: string; slug: string; parentId?: string | null }>(
        platformApiContracts.admin.categories,
        {
          method: "POST",
          body: JSON.stringify({
            id: input.id,
            nameAr: input.nameAr,
            slug: input.slug,
            icon: input.icon,
            parentId: input.parentId,
          }),
        },
        { roleHeader: "super-admin" },
      );
      return mapCategory(payload);
    },
    async deleteCategory(id) {
      const response = await apiRequest<{ deleted: boolean }>(
        `${platformApiContracts.admin.categories}/${id}`,
        { method: "DELETE" },
        { roleHeader: "super-admin" },
      );
      return Boolean(response.deleted);
    },
    async createGlobalOffer(input) {
      const offer = await apiRequest<{ id: string; title: string; code?: string; discountValue?: string | number; createdAt?: string }>(
        platformApiContracts.admin.offers,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        { roleHeader: "super-admin" },
      );

      const mapped: GlobalOfferRecord = {
        id: offer.id,
        title: offer.title,
        code: offer.code ?? input.code ?? null,
        discountText: input.discountText,
        createdAt: offer.createdAt ? offer.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
      const current = readStorage<GlobalOfferRecord[]>("bamoraAdminOfferHistory", []);
      writeStorage("bamoraAdminOfferHistory", [mapped, ...current]);
      return mapped;
    },
    async sendBroadcast(input) {
      const broadcast = await apiRequest<{ id: string; audience: "all-users" | "customers" | "merchants"; title: string; body: string; sentAt: string }>(
        platformApiContracts.admin.broadcasts,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        { roleHeader: "super-admin" },
      );
      const current = readStorage<BroadcastRecord[]>("bamoraAdminBroadcastHistory", []);
      writeStorage("bamoraAdminBroadcastHistory", [broadcast, ...current]);
      return broadcast;
    },
    async updateUserStatus(id, status) {
      const updated = await apiRequest<{ id: string; email: string; role: string; status: string; createdAt: string }>(
        `${platformApiContracts.admin.users}/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        { roleHeader: "super-admin" },
      );
      return mapUser(updated);
    },
    async deleteUser(id) {
      const response = await apiRequest<{ deleted: boolean }>(
        `${platformApiContracts.admin.users}/${id}`,
        { method: "DELETE" },
        { roleHeader: "super-admin" },
      );
      return Boolean(response.deleted);
    },
    async assignSupportTicket(id, assignedTo) {
      const updated = await apiRequest<{ id: string; title: string; body: string; createdAt: string }>(
        `${platformApiContracts.admin.supportTickets}/${id}/assign`,
        {
          method: "PATCH",
          body: JSON.stringify({ assignedTo }),
        },
        { roleHeader: "super-admin" },
      );
      return {
        id: updated.id,
        userName: updated.title,
        subject: updated.body,
        status: "in_progress",
        assignedTo,
        createdAt: new Date(updated.createdAt).toLocaleString("ar-EG"),
      };
    },
    async updateSupportTicketStatus(id, status) {
      const updated = await apiRequest<{ id: string; title: string; body: string; createdAt: string }>(
        `${platformApiContracts.admin.supportTickets}/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        { roleHeader: "super-admin" },
      );
      return {
        id: updated.id,
        userName: updated.title,
        subject: updated.body,
        status,
        assignedTo: null,
        createdAt: new Date(updated.createdAt).toLocaleString("ar-EG"),
      };
    },
  };
}

function createApiCustomerRepository(): CustomerRepository {
  const mapDashboard = (
    payload: {
      profile: { id: string; fullName: string; email: string; phone?: string | null; locale?: string | null };
      addresses: Array<{ id: string; label: string; line1: string; city: string; isDefault: boolean }>;
      products: Array<{ id: string; name: string; price: string; stock?: number }>;
      favorites?: string[];
      cart?: Array<{ id: string; productId: string; quantity: number; size: string; color: string }>;
      orders?: Array<{ id: string; status: string; total: string; createdAt?: string; productId?: string }>;
    },
    notifications: Array<{ id: string; title: string; body?: string }> = [],
  ): CustomerDashboardData => {
    const products: StorefrontProduct[] = payload.products.map((product, index) => ({
      id: product.id,
      titleAr: product.name,
      price: formatIls(parseCurrencyNumber(product.price)),
      detail: "منتج مميز من BAMORA.",
      reviewCount: 0,
      averageRating: 5,
      category: "عام",
      featured: index < 3,
      topSelling: index >= 3 && index < 6,
    }));

    const fallbackProductId = products[0]?.id ?? "";
    return {
      profile: mapProfile(payload.profile),
      addresses: payload.addresses,
      products,
      favoriteIds: payload.favorites ?? [],
      cart: payload.cart ?? [],
      orders:
        payload.orders?.map((order) => ({
          id: order.id,
          productId: order.productId ?? fallbackProductId,
          status: normalizeOrderStatus(order.status),
          total: formatIls(parseCurrencyNumber(order.total)),
          createdAt: order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-EG") : new Date().toLocaleDateString("ar-EG"),
        })) ?? [],
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        detail: notification.body ?? "",
      })),
    };
  };

  const authHeaders = () => ({ roleHeader: "customer" as const });

  return {
    async getDashboard() {
      const [dashboard, notifications] = await Promise.all([
        apiRequest<{
          profile: { id: string; fullName: string; email: string; phone?: string | null; locale?: string | null };
          addresses: Array<{ id: string; label: string; line1: string; city: string; isDefault: boolean }>;
          products: Array<{ id: string; name: string; price: string; stock?: number }>;
          favorites?: string[];
          cart?: Array<{ id: string; productId: string; quantity: number; size: string; color: string }>;
          orders?: Array<{ id: string; status: string; total: string; createdAt?: string; productId?: string }>;
        }>(platformApiContracts.customer.dashboard, undefined, authHeaders()),
        apiRequest<Array<{ id: string; title: string; body?: string }>>(
          platformApiContracts.customer.notifications,
          undefined,
          authHeaders(),
        ),
      ]);

      return mapDashboard(dashboard, notifications);
    },
    async signup(payload) {
      const result = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; role: "customer" | "merchant" | "super-admin" };
      }>(
        platformApiContracts.auth.signup,
        {
          method: "POST",
          body: JSON.stringify({
            name: payload.fullName,
            email: payload.email,
            password: payload.password,
            role: "customer",
          }),
        },
        { skipAuth: true },
      );
      saveAuthSession(result);
      const dashboard = await this.getDashboard();
      return dashboard.profile;
    },
    async login(payload) {
      const result = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; role: "customer" | "merchant" | "super-admin" };
      }>(
        platformApiContracts.auth.login,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        { skipAuth: true },
      );
      saveAuthSession(result);
      const dashboard = await this.getDashboard();
      return dashboard.profile;
    },
    async updateProfile(patch) {
      const current = await this.getDashboard();
      return {
        ...current.profile,
        ...patch,
      };
    },
    async upsertAddress(input) {
      const payload = await apiRequest<CustomerAddress>(
        platformApiContracts.customer.addresses,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        authHeaders(),
      );
      return payload;
    },
    async toggleFavorite(productId) {
      return apiRequest<string[]>(
        `${platformApiContracts.customer.favorites}/${productId}/toggle`,
        { method: "POST" },
        authHeaders(),
      );
    },
    async addToCart(input) {
      return apiRequest<CustomerCartItem>(
        platformApiContracts.customer.cart,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        authHeaders(),
      );
    },
    async removeFromCart(cartItemId) {
      const response = await apiRequest<{ deleted: boolean }>(
        `${platformApiContracts.customer.cart}/${cartItemId}`,
        { method: "DELETE" },
        authHeaders(),
      );
      return Boolean(response.deleted);
    },
    async checkout() {
      const order = await apiRequest<{ id: string; status: string; total: string }>(
        platformApiContracts.customer.checkout,
        { method: "POST" },
        authHeaders(),
      );

      const dashboard = await this.getDashboard();
      return {
        id: order.id,
        productId: dashboard.products[0]?.id ?? "",
        status: normalizeOrderStatus(order.status),
        total: formatIls(parseCurrencyNumber(order.total)),
        createdAt: new Date().toLocaleDateString("ar-EG"),
      };
    },
    async submitReview(input) {
      await apiRequest(
        platformApiContracts.customer.reviews,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
        authHeaders(),
      );
      const dashboard = await this.getDashboard();
      return dashboard.products.find((product) => product.id === input.productId) ?? null;
    },
  };
}

function getMode(explicitMode?: DataSourceMode): DataSourceMode {
  if (explicitMode) {
    return explicitMode;
  }

  if (readRuntimeEnv("NEXT_PUBLIC_BAMORA_DATA_SOURCE") === "api") {
    return "api";
  }

  return "mock";
}

export function createMerchantRepository(mode?: DataSourceMode): MerchantRepository {
  return getMode(mode) === "api" ? createApiMerchantRepository() : createMockMerchantRepository();
}

export function createAdminRepository(mode?: DataSourceMode): AdminRepository {
  return getMode(mode) === "api" ? createApiAdminRepository() : createMockAdminRepository();
}

export function createCustomerRepository(mode?: DataSourceMode): CustomerRepository {
  return getMode(mode) === "api" ? createApiCustomerRepository() : createMockCustomerRepository();
}

export function createMerchantService(mode?: DataSourceMode) {
  const repository = createMerchantRepository(mode);
  return {
    repository,
    loadDashboard: () => repository.getDashboard(),
  };
}

export function createAdminService(mode?: DataSourceMode) {
  const repository = createAdminRepository(mode);
  return {
    repository,
    loadDashboard: () => repository.getDashboard(),
  };
}

export function createCustomerService(mode?: DataSourceMode) {
  const repository = createCustomerRepository(mode);
  return {
    repository,
    loadDashboard: () => repository.getDashboard(),
  };
}

export const platformApiContracts = {
  auth: {
    signup: "/api/auth/signup",
    login: "/api/auth/login",
    refresh: "/api/auth/refresh",
  },
  customer: {
    dashboard: "/api/customer/dashboard",
    profile: "/api/customer/profile",
    addresses: "/api/customer/addresses",
    favorites: "/api/customer/favorites",
    cart: "/api/customer/cart",
    checkout: "/api/customer/checkout",
    orders: "/api/customer/orders",
    notifications: "/api/customer/notifications",
    search: "/api/customer/search",
    reviews: "/api/customer/reviews",
  },
  merchant: {
    dashboard: "/api/merchant/dashboard",
    products: "/api/merchant/products",
    orders: "/api/merchant/orders",
    coupons: "/api/merchant/coupons",
    uploads: "/api/uploads/images",
  },
  admin: {
    dashboard: "/api/admin/dashboard",
    merchants: "/api/admin/merchants",
    products: "/api/admin/products",
    orders: "/api/admin/orders",
    users: "/api/admin/users",
    supportTickets: "/api/admin/support-tickets",
    offers: "/api/admin/offers",
    broadcasts: "/api/admin/broadcasts",
    categories: "/api/admin/categories",
  },
  integrations: {
    config: "/api/integrations/config",
    paymentWebhook: "/api/integrations/webhooks/payment",
    shippingWebhook: "/api/integrations/webhooks/shipping",
  },
} as const;
