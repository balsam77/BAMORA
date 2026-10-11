"use client";

import { useEffect, useMemo, useState } from "react";
import MerchantPage from "../../../merchant/src/app/page";
import AdminPage from "../../../admin/src/app/page";
import {
  ADMIN_NAME_KEY,
  clearRoleSession,
  createMerchantRepository,
  getCurrentRole,
  setCurrentRole,
  MERCHANT_NAME_KEY,
  type AdminOrderRecord,
} from "@bamora/platform";
import styles from "./page.module.css";

type BusinessRole = "merchant" | "super-admin" | "delivery";
type Workspace = "merchant" | "admin" | "delivery";
type AppLanguage = "ar" | "en";
type AccountType = "delivery" | "merchant" | "super-admin";
type DeliveryStatus = "ready" | "assigned" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled";
type DeliveryEmployeeStatus = "active" | "disabled";

type DeliveryEmployee = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  region: string;
  status: DeliveryEmployeeStatus;
  createdAt: string;
};

type DeliveryOrder = {
  id: string;
  merchantName: string;
  merchantOwner: string;
  merchantPhone: string;
  merchantAddress: string;
  merchantRegion: string;
  merchantMapsUrl: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerRegion: string;
  customerMapsUrl: string;
  items: Array<{ title: string; quantity: number; color: string; size: string; unitPrice: string; imageUrl?: string }>;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  status: DeliveryStatus;
  createdAt: string;
  preparedAt: string;
  pickedUpAt: string;
  deliveredAt: string;
  notes: string;
  assignedEmployeeId: string | null;
};

const DELIVERY_ROLE_KEY = "bamoraBusinessRole";
const DELIVERY_USER_KEY = "bamoraBusinessDeliveryUser";
const WORKSPACE_KEY = "bamoraBusinessWorkspace";
const DELIVERY_STATUS_KEY = "bamoraBusinessDeliveryStatus";
const DELIVERY_EMPLOYEES_KEY = "bamoraBusinessDeliveryEmployees";
const DELIVERY_ASSIGNMENTS_KEY = "bamoraBusinessDeliveryAssignments";

const DELIVERY_STATUSES: DeliveryStatus[] = ["ready", "assigned", "picked_up", "out_for_delivery", "delivered", "cancelled"];
const DELIVERY_ACTIVE_FLOW: DeliveryStatus[] = ["ready", "assigned", "picked_up", "out_for_delivery", "delivered"];

const DELIVERY_BOOTSTRAP_USERNAME = process.env.NEXT_PUBLIC_BAMORA_DELIVERY_USERNAME ?? "";
const DELIVERY_BOOTSTRAP_PASSWORD = process.env.NEXT_PUBLIC_BAMORA_DELIVERY_PASSWORD ?? "";
const ADMIN_API_EMAIL = process.env.NEXT_PUBLIC_BAMORA_ADMIN_EMAIL ?? "admin@bamora.local";
const ADMIN_API_PASSWORD = process.env.NEXT_PUBLIC_BAMORA_ADMIN_PASSWORD ?? "";
const API_BASE_URL = process.env.NEXT_PUBLIC_BAMORA_API_URL ?? "http://localhost:4001";

const merchantRepository = createMerchantRepository("api");

async function establishAdminApiSession(preferredEmail?: string, preferredPassword?: string) {
  const fallbackName = canUseStorage() ? window.localStorage.getItem(ADMIN_NAME_KEY) ?? "" : "";
  const candidates = Array.from(new Set([preferredEmail?.trim(), fallbackName.trim(), ADMIN_API_EMAIL, "admin@bamora.com", "admin@bamora.local"].filter(Boolean)));
  const password = preferredPassword?.trim() || ADMIN_API_PASSWORD;

  for (const email of candidates) {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      continue;
    }

    const session = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; role: "customer" | "merchant" | "super-admin" };
    };

    if (canUseStorage()) {
      window.localStorage.setItem("bamoraAccessToken", session.accessToken);
      window.localStorage.setItem("bamoraRefreshToken", session.refreshToken);
      window.localStorage.setItem("bamoraAuthUserId", session.user.id);
      window.localStorage.setItem("bamoraAuthUserRole", session.user.role);
    }

    return;
  }

  throw new Error("Admin API login failed. Verify admin email/password for API.");
}

const copy = {
  ar: {
    appTitle: "BAMORA Business",
    pickRoleTitle: "اختيار نوع الدخول",
    pickRoleSubtitle: "اختر نوع الحساب أولًا، ثم سجل الدخول بصيغة هذا النوع فقط.",
    chooseDelivery: "Delivery",
    chooseMerchant: "Merchant",
    chooseAdmin: "Super Admin",
    continueToLogin: "متابعة تسجيل الدخول",
    backToRoleSelect: "العودة لاختيار النوع",
    username: "اسم المستخدم",
    email: "البريد الإلكتروني",
    loginNumber: "رقم تسجيل الدخول",
    password: "كلمة المرور",
    phone: "رقم الهاتف",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    accessDenied: "بيانات الدخول غير صحيحة.",
    roleNotAllowed: "نوع الحساب الحالي غير مسموح له بهذه الصفحة.",
    deliveryTitle: "مركز التوصيل",
    deliverySubtitle: "لوحة سريعة لموظفي شركة التوصيل: مناطق، تعيين، حالات، واتصال مباشر.",
    noOrders: "لا توجد طلبات مطابقة حاليًا.",
    readyNow: "جاهز للتوصيل الآن",
    assignedToEmployee: "مُعيّنة لمندوب",
    pickedUp: "تم الاستلام",
    outForDelivery: "خرجت للتوصيل",
    delivered: "تم التسليم",
    todayOrders: "طلبات اليوم",
    region: "المنطقة",
    allRegions: "كل المناطق",
    storeName: "اسم المحل",
    customerName: "اسم الزبون",
    status: "الحالة",
    allEmployees: "كل الموظفين",
    unassigned: "غير معيّن",
    date: "التاريخ",
    search: "بحث بالطلب أو المحل أو الزبون",
    orderId: "رقم الطلب",
    orderDetails: "تفاصيل الطلب",
    shopSection: "SHOP",
    customerSection: "CUSTOMER",
    orderSection: "ORDER",
    shopOwner: "مسؤول المحل",
    phoneLabel: "الهاتف",
    address: "العنوان",
    location: "الموقع",
    products: "المنتجات",
    quantities: "الكميات",
    total: "المبلغ",
    payment: "طريقة الدفع",
    paymentStatus: "حالة الدفع",
    notes: "الملاحظات",
    createdAt: "وقت الإنشاء",
    preparedAt: "وقت الجاهزية",
    pickedUpAt: "وقت الاستلام",
    deliveredAt: "وقت التسليم",
    quickActions: "أزرار سريعة",
    callStore: "اتصل بالمحل",
    callCustomer: "اتصل بالزبون",
    openStoreMap: "افتح موقع المحل",
    openCustomerMap: "افتح موقع الزبون",
    receiveOrder: "استلام الطلب",
    startDelivery: "بدء التوصيل",
    markDelivered: "تم التسليم",
    reportIssue: "مشكلة في الطلب",
    assignToEmployee: "تعيين لموظف",
    assign: "تعيين",
    assignedTo: "الموظف المعيّن",
    nextOrder: "الطلب التالي",
    previousOrder: "الطلب السابق",
    regionsBoard: "لوحة المناطق",
    ordersCount: "عدد الطلبات",
    updateStatus: "تحديث الحالة",
    employeeManagement: "إدارة موظفي التوصيل",
    addEmployee: "إضافة موظف",
    editEmployee: "تعديل موظف",
    fullName: "الاسم الكامل",
    employeePhone: "رقم الموظف",
    employeeRegion: "منطقة الموظف",
    cancelEdit: "إلغاء",
    disableEmployee: "تعطيل",
    enableEmployee: "تفعيل",
    deleteEmployee: "حذف",
    employeeOrders: "طلبات الموظف",
    resetFilters: "تصفير الفلاتر",
    invalidFlowAction: "الحالة الحالية لا تسمح بهذه العملية.",
    adminWorkspace: "لوحة الإدارة",
    merchantPhoneHint: "أدخل رقم هاتف التاجر",
    merchantPasswordHint: "آخر 4 أرقام من رقم الهاتف",
    wrongMerchantCredentials: "رقم الهاتف أو آخر 4 أرقام غير صحيحة.",
  },
  en: {
    appTitle: "BAMORA Business",
    pickRoleTitle: "Choose Login Type",
    pickRoleSubtitle: "Select account type first, then sign in with that type only.",
    chooseDelivery: "Delivery",
    chooseMerchant: "Merchant",
    chooseAdmin: "Super Admin",
    continueToLogin: "Continue to sign in",
    backToRoleSelect: "Back to type selection",
    username: "Username",
    email: "Email",
    loginNumber: "Login number",
    password: "Password",
    phone: "Phone number",
    login: "Sign in",
    logout: "Sign out",
    accessDenied: "Invalid credentials.",
    roleNotAllowed: "Current account type is not allowed to access this page.",
    deliveryTitle: "Delivery center",
    deliverySubtitle: "Fast workspace for delivery staff: regions, assignment, statuses, and direct contact actions.",
    noOrders: "No matching orders right now.",
    readyNow: "Ready for delivery now",
    assignedToEmployee: "Assigned to couriers",
    pickedUp: "Picked up",
    outForDelivery: "Out for delivery",
    delivered: "Delivered",
    todayOrders: "Orders today",
    region: "Region",
    allRegions: "All regions",
    storeName: "Store name",
    customerName: "Customer name",
    status: "Status",
    allEmployees: "All employees",
    unassigned: "Unassigned",
    date: "Date",
    search: "Search by order, store, or customer",
    orderId: "Order ID",
    orderDetails: "Order details",
    shopSection: "SHOP",
    customerSection: "CUSTOMER",
    orderSection: "ORDER",
    shopOwner: "Store owner",
    phoneLabel: "Phone",
    address: "Address",
    location: "Location",
    products: "Products",
    quantities: "Quantities",
    total: "Amount",
    payment: "Payment",
    paymentStatus: "Payment status",
    notes: "Notes",
    createdAt: "Created at",
    preparedAt: "Ready at",
    pickedUpAt: "Picked up at",
    deliveredAt: "Delivered at",
    quickActions: "Quick actions",
    callStore: "Call store",
    callCustomer: "Call customer",
    openStoreMap: "Open store map",
    openCustomerMap: "Open customer map",
    receiveOrder: "Receive order",
    startDelivery: "Start delivery",
    markDelivered: "Delivered",
    reportIssue: "Order issue",
    assignToEmployee: "Assign to employee",
    assign: "Assign",
    assignedTo: "Assigned employee",
    nextOrder: "Next order",
    previousOrder: "Previous order",
    regionsBoard: "Regions board",
    ordersCount: "Orders count",
    updateStatus: "Update status",
    employeeManagement: "Delivery employees management",
    addEmployee: "Add employee",
    editEmployee: "Edit employee",
    fullName: "Full name",
    employeePhone: "Employee phone",
    employeeRegion: "Employee region",
    cancelEdit: "Cancel",
    disableEmployee: "Disable",
    enableEmployee: "Enable",
    deleteEmployee: "Delete",
    employeeOrders: "Employee orders",
    resetFilters: "Reset filters",
    invalidFlowAction: "Current status does not allow this action.",
    adminWorkspace: "Admin dashboard",
    merchantPhoneHint: "Enter merchant phone number",
    merchantPasswordHint: "Last 4 digits of phone",
    wrongMerchantCredentials: "Phone or last 4 digits are not valid.",
  },
} as const;

const deliveryStatusLabel: Record<AppLanguage, Record<DeliveryStatus, string>> = {
  ar: {
    ready: "READY FOR DELIVERY",
    assigned: "ASSIGNED",
    picked_up: "PICKED UP",
    out_for_delivery: "OUT FOR DELIVERY",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
  },
  en: {
    ready: "READY FOR DELIVERY",
    assigned: "ASSIGNED",
    picked_up: "PICKED UP",
    out_for_delivery: "OUT FOR DELIVERY",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
  },
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function getSavedLanguage(): AppLanguage {
  if (!canUseStorage()) {
    return "ar";
  }
  const value = window.localStorage.getItem("bamoraLanguage");
  return value === "en" ? "en" : "ar";
}

function readJsonStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearBusinessSession() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(DELIVERY_ROLE_KEY);
  window.localStorage.removeItem(DELIVERY_USER_KEY);
  window.localStorage.removeItem(WORKSPACE_KEY);
}

function persistDeliverySession(username: string) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(DELIVERY_ROLE_KEY, "delivery");
  window.localStorage.setItem(DELIVERY_USER_KEY, username);
  window.localStorage.setItem(WORKSPACE_KEY, "delivery");
}

function persistBusinessWorkspace(workspace: Workspace) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(WORKSPACE_KEY, workspace);
}

function authenticateDeliveryUser(username: string, password: string, employees: DeliveryEmployee[]) {
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedUsername || !normalizedPassword) {
    return null;
  }

  const employee = employees.find((item) => {
    if (item.status !== "active") {
      return false;
    }

    const email = item.email.trim().toLowerCase();
    const fullName = item.fullName.trim().toLowerCase();

    return (normalizedUsername === email || normalizedUsername === fullName) && normalizedPassword === item.password.trim();
  });

  if (employee) {
    return employee.fullName;
  }

  const hasBootstrap = DELIVERY_BOOTSTRAP_USERNAME.trim().length > 0 && DELIVERY_BOOTSTRAP_PASSWORD.trim().length > 0;
  if (
    hasBootstrap &&
    normalizedUsername === DELIVERY_BOOTSTRAP_USERNAME.trim().toLowerCase() &&
    normalizedPassword === DELIVERY_BOOTSTRAP_PASSWORD.trim()
  ) {
    return DELIVERY_BOOTSTRAP_USERNAME.trim();
  }

  return null;
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function parseRegion(address: string): string {
  const cleaned = address.trim();
  if (!cleaned || cleaned === "-") {
    return "-";
  }

  const chunks = cleaned
    .split(/[-,|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return chunks[chunks.length - 1] ?? "-";
}

function buildMapUrl(primary: string, fallback: string): string {
  const query = primary !== "-" ? primary : fallback;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function toDeliveryStatus(order: AdminOrderRecord): DeliveryStatus {
  if (order.status === "canceled") {
    return "cancelled";
  }
  if (order.status === "delivered") {
    return "delivered";
  }
  if (order.status === "shipped") {
    return "out_for_delivery";
  }
  return "ready";
}

function toDeliveryOrder(order: AdminOrderRecord, assignments: Record<string, string>, statusOverrides: Record<string, DeliveryStatus>): DeliveryOrder {
  const merchantName = order.merchantContactName ?? order.merchant ?? "-";
  const merchantAddress = order.merchantAddress ?? merchantName;
  const customerAddress = order.shippingAddress ?? "-";
  const merchantRegion = parseRegion(merchantAddress);
  const customerRegion = parseRegion(customerAddress);
  const baseStatus = toDeliveryStatus(order);

  return {
    id: order.id,
    merchantName,
    merchantOwner: order.merchantContactName ?? merchantName,
    merchantPhone: order.merchantPhone ?? "-",
    merchantAddress,
    merchantRegion,
    merchantMapsUrl: order.merchantMapsUrl ?? buildMapUrl(merchantAddress, merchantName),
    customerName: order.customerName ?? order.customer ?? "-",
    customerPhone: order.customerPhone ?? "-",
    customerAddress,
    customerRegion,
    customerMapsUrl: buildMapUrl(customerAddress, order.customerName ?? order.customer ?? "Customer"),
    items: (order.items ?? []).map((item) => ({
      title: item.title,
      quantity: item.quantity,
      color: item.color,
      size: item.size,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl,
    })),
    total: order.total,
    paymentMethod: order.paymentMethod ?? "-",
    paymentStatus: order.paymentStatus ?? "-",
    status: statusOverrides[order.id] ?? baseStatus,
    createdAt: order.createdAt ?? "-",
    preparedAt: order.preparedAt ?? "-",
    pickedUpAt: order.pickedUpAt ?? "-",
    deliveredAt: order.deliveredAt ?? "-",
    notes: order.notes ?? order.attentionState ?? "-",
    assignedEmployeeId: assignments[order.id] ?? null,
  };
}

function canTransition(current: DeliveryStatus, next: DeliveryStatus): boolean {
  if (current === next) {
    return true;
  }

  if (next === "cancelled") {
    return current !== "delivered";
  }

  const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
    ready: ["assigned"],
    assigned: ["picked_up"],
    picked_up: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  return allowed[current].includes(next);
}

function belongsToDeliveryBoard(order: DeliveryOrder) {
  return DELIVERY_STATUSES.includes(order.status);
}

function sanitizeLegacyDeliveryEmployees() {
  const employees = readJsonStorage<DeliveryEmployee[]>(DELIVERY_EMPLOYEES_KEY, []);
  const cleaned = employees.filter((employee) => {
    const email = employee.email.toLowerCase();
    if (email.includes("@bamora.test")) {
      return false;
    }
    if (employee.fullName.toLowerCase() === "delivery user") {
      return false;
    }
    return true;
  });

  if (cleaned.length !== employees.length) {
    writeJsonStorage(DELIVERY_EMPLOYEES_KEY, cleaned);
  }
}

function DeliveryWorkspace({
  language,
  isAdminView,
  onLogout,
}: {
  language: AppLanguage;
  isAdminView: boolean;
  onLogout: () => void;
}) {
  const text = language === "en" ? copy.en : copy.ar;

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, DeliveryStatus>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<DeliveryEmployee[]>([]);
  const [collapsedRegions, setCollapsedRegions] = useState<Record<string, boolean>>({});
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>({});
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    region: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    document.body.dir = language === "en" ? "ltr" : "rtl";
  }, [language]);

  useEffect(() => {
    setStatusOverrides(readJsonStorage<Record<string, DeliveryStatus>>(DELIVERY_STATUS_KEY, {}));
    setAssignments(readJsonStorage<Record<string, string>>(DELIVERY_ASSIGNMENTS_KEY, {}));
    setEmployees(readJsonStorage<DeliveryEmployee[]>(DELIVERY_EMPLOYEES_KEY, []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/admin/orders`, {
      headers: canUseStorage() && window.localStorage.getItem("bamoraAccessToken")
        ? { Authorization: `Bearer ${window.localStorage.getItem("bamoraAccessToken")}` }
        : undefined,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        return response.json() as Promise<AdminOrderRecord[]>;
      })
      .then((dashboard) => {
        if (cancelled) {
          return;
        }

        const mapped = dashboard
          .map((order) => toDeliveryOrder(order, assignments, statusOverrides))
          .filter(belongsToDeliveryBoard);

        setOrders(mapped);
        setSelectedOrderId((current) => current ?? mapped[0]?.id ?? null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setNotice(error instanceof Error ? error.message : "Delivery workspace is unavailable.");
      });

    return () => {
      cancelled = true;
    };
  }, [assignments, statusOverrides]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const order of orders) {
      if (order.assignedEmployeeId) {
        nextDrafts[order.id] = order.assignedEmployeeId;
      }
    }
    setDraftAssignments((current) => ({ ...nextDrafts, ...current }));
  }, [orders]);

  const activeEmployees = useMemo(() => employees.filter((item) => item.status === "active"), [employees]);

  const regionOptions = useMemo(() => {
    const values = new Set<string>();
    for (const order of orders) {
      if (order.customerRegion !== "-") {
        values.add(order.customerRegion);
      }
      if (order.merchantRegion !== "-") {
        values.add(order.merchantRegion);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders
      .filter((order) => {
        if (statusFilter !== "all" && order.status !== statusFilter) {
          return false;
        }

        if (regionFilter !== "all" && order.customerRegion !== regionFilter && order.merchantRegion !== regionFilter) {
          return false;
        }

        if (employeeFilter !== "all") {
          if (employeeFilter === "unassigned" && order.assignedEmployeeId) {
            return false;
          }
          if (employeeFilter !== "unassigned" && order.assignedEmployeeId !== employeeFilter) {
            return false;
          }
        }

        if (dateFilter && !order.createdAt.includes(dateFilter)) {
          return false;
        }

        if (!query) {
          return true;
        }

        const assignedEmployee = employees.find((employee) => employee.id === order.assignedEmployeeId);
        return [
          order.id,
          order.merchantName,
          order.merchantOwner,
          order.customerName,
          order.customerRegion,
          order.merchantRegion,
          assignedEmployee?.fullName ?? "",
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const rankA = DELIVERY_ACTIVE_FLOW.indexOf(a.status);
        const rankB = DELIVERY_ACTIVE_FLOW.indexOf(b.status);
        const normalizedRankA = rankA === -1 ? Number.MAX_SAFE_INTEGER : rankA;
        const normalizedRankB = rankB === -1 ? Number.MAX_SAFE_INTEGER : rankB;
        const statusRank = normalizedRankA - normalizedRankB;
        if (statusRank !== 0) {
          return statusRank;
        }
        return a.id.localeCompare(b.id);
      });
  }, [dateFilter, employeeFilter, employees, orders, regionFilter, search, statusFilter]);

  const groupedByRegion = useMemo(() => {
    const groups = new Map<string, DeliveryOrder[]>();
    for (const order of visibleOrders) {
      const key = order.customerRegion !== "-" ? order.customerRegion : order.merchantRegion;
      const current = groups.get(key) ?? [];
      current.push(order);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([regionName, groupOrders]) => ({
        regionName,
        orders: groupOrders,
      }))
      .sort((a, b) => b.orders.length - a.orders.length || a.regionName.localeCompare(b.regionName));
  }, [visibleOrders]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0] ?? null,
    [selectedOrderId, visibleOrders],
  );

  const selectedOrderIndex = useMemo(
    () => (selectedOrder ? visibleOrders.findIndex((order) => order.id === selectedOrder.id) : -1),
    [selectedOrder, visibleOrders],
  );

  const stats = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    return {
      readyNow: orders.filter((order) => order.status === "ready").length,
      assignedToEmployee: orders.filter((order) => order.status === "assigned").length,
      pickedUp: orders.filter((order) => order.status === "picked_up").length,
      outForDelivery: orders.filter((order) => order.status === "out_for_delivery").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      todayOrders: orders.filter((order) => order.createdAt.includes(todayKey) || order.createdAt.includes(String(new Date().getFullYear()))).length,
    };
  }, [orders]);

  const employeeLoad = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders) {
      if (order.assignedEmployeeId) {
        map[order.assignedEmployeeId] = (map[order.assignedEmployeeId] ?? 0) + 1;
      }
    }
    return map;
  }, [orders]);

  const persistStatusOverrides = (next: Record<string, DeliveryStatus>) => {
    setStatusOverrides(next);
    writeJsonStorage(DELIVERY_STATUS_KEY, next);
  };

  const persistAssignments = (next: Record<string, string>) => {
    setAssignments(next);
    writeJsonStorage(DELIVERY_ASSIGNMENTS_KEY, next);
  };

  const persistEmployees = (next: DeliveryEmployee[]) => {
    setEmployees(next);
    writeJsonStorage(DELIVERY_EMPLOYEES_KEY, next);
  };

  const applyStatus = (order: DeliveryOrder, nextStatus: DeliveryStatus) => {
    if (!canTransition(order.status, nextStatus)) {
      setNotice(text.invalidFlowAction);
      return;
    }

    const nextOverrides = {
      ...statusOverrides,
      [order.id]: nextStatus,
    };
    persistStatusOverrides(nextOverrides);
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: nextStatus } : item)));
  };

  const assignOrderToEmployee = (order: DeliveryOrder) => {
    if (!isAdminView) {
      return;
    }

    const employeeId = draftAssignments[order.id];
    if (!employeeId) {
      return;
    }

    const target = employees.find((employee) => employee.id === employeeId);
    if (!target || target.status !== "active") {
      return;
    }

    const nextAssignments = {
      ...assignments,
      [order.id]: employeeId,
    };
    persistAssignments(nextAssignments);
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, assignedEmployeeId: employeeId } : item)));

    if (order.status === "ready") {
      const nextOverrides = {
        ...statusOverrides,
        [order.id]: "assigned" as DeliveryStatus,
      };
      persistStatusOverrides(nextOverrides);
    }
  };

  const resetEmployeeForm = () => {
    setEditingEmployeeId(null);
    setEmployeeForm({
      fullName: "",
      email: "",
      password: "",
      phone: "",
      region: "",
    });
  };

  const saveEmployee = () => {
    if (!isAdminView) {
      return;
    }

    const fullName = employeeForm.fullName.trim();
    const email = employeeForm.email.trim().toLowerCase();
    const password = employeeForm.password.trim();
    const phone = employeeForm.phone.trim();
    const region = employeeForm.region.trim() || "-";

    if (!fullName || !email || !password) {
      return;
    }

    if (editingEmployeeId) {
      const next = employees.map((employee) => {
        if (employee.id !== editingEmployeeId) {
          return employee;
        }
        return {
          ...employee,
          fullName,
          email,
          password,
          phone: phone || "-",
          region,
        };
      });
      persistEmployees(next);
      resetEmployeeForm();
      return;
    }

    if (employees.some((employee) => employee.email === email)) {
      return;
    }

    const created: DeliveryEmployee = {
      id: `DRV-${Date.now()}`,
      fullName,
      email,
      password,
      phone: phone || "-",
      region,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    persistEmployees([created, ...employees]);
    resetEmployeeForm();
  };

  const editEmployee = (employee: DeliveryEmployee) => {
    if (!isAdminView) {
      return;
    }

    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      fullName: employee.fullName,
      email: employee.email,
      password: employee.password,
      phone: employee.phone,
      region: employee.region,
    });
  };

  const toggleEmployeeStatus = (employeeId: string) => {
    if (!isAdminView) {
      return;
    }

    const next: DeliveryEmployee[] = employees.map((employee) => {
      if (employee.id !== employeeId) {
        return employee;
      }
      return {
        ...employee,
        status: employee.status === "active" ? "disabled" : "active",
      };
    });
    persistEmployees(next);
  };

  const deleteEmployee = (employeeId: string) => {
    if (!isAdminView) {
      return;
    }

    const nextEmployees = employees.filter((employee) => employee.id !== employeeId);
    persistEmployees(nextEmployees);

    const nextAssignments: Record<string, string> = {};
    for (const [orderId, assignee] of Object.entries(assignments)) {
      if (assignee !== employeeId) {
        nextAssignments[orderId] = assignee;
      }
    }
    persistAssignments(nextAssignments);

    const nextOverrides = { ...statusOverrides };
    for (const order of orders) {
      if (order.assignedEmployeeId === employeeId && order.status === "assigned") {
        nextOverrides[order.id] = "ready";
      }
    }
    persistStatusOverrides(nextOverrides);
  };

  return (
    <div className={styles.deliveryShell} dir={language === "en" ? "ltr" : "rtl"}>
      <div className={styles.deliveryHeader}>
        <div>
          <p className={styles.sectionTag}>BAMORA Business</p>
          <h1 className={styles.title}>{text.deliveryTitle}</h1>
          <p className={styles.subtitle}>{text.deliverySubtitle}</p>
        </div>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={onLogout}>{text.logout}</button>
        </div>
      </div>

      <section className={styles.statGrid}>
        <article className={styles.statCard}><p className={styles.muted}>{text.readyNow}</p><strong>{stats.readyNow}</strong></article>
        <article className={styles.statCard}><p className={styles.muted}>{text.assignedToEmployee}</p><strong>{stats.assignedToEmployee}</strong></article>
        <article className={styles.statCard}><p className={styles.muted}>{text.pickedUp}</p><strong>{stats.pickedUp}</strong></article>
        <article className={styles.statCard}><p className={styles.muted}>{text.outForDelivery}</p><strong>{stats.outForDelivery}</strong></article>
        <article className={styles.statCard}><p className={styles.muted}>{text.delivered}</p><strong>{stats.delivered}</strong></article>
        <article className={styles.statCard}><p className={styles.muted}>{text.todayOrders}</p><strong>{stats.todayOrders}</strong></article>
      </section>

      <section className={styles.panel}>
        <div className={styles.filtersGrid}>
          <input className={styles.inputField} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} />
          <select className={styles.inputSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DeliveryStatus | "all")}>
            <option value="all">All</option>
            {DELIVERY_STATUSES.map((status) => (
              <option key={status} value={status}>{deliveryStatusLabel[language][status]}</option>
            ))}
          </select>
          <select className={styles.inputSelect} value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            <option value="all">{text.allRegions}</option>
            {regionOptions.map((regionName) => (
              <option key={regionName} value={regionName}>{regionName}</option>
            ))}
          </select>
          <select className={styles.inputSelect} value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
            <option value="all">{text.allEmployees}</option>
            <option value="unassigned">{text.unassigned}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.fullName}</option>
            ))}
          </select>
          <input className={styles.inputField} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} placeholder={text.date} />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setRegionFilter("all");
              setEmployeeFilter("all");
              setDateFilter("");
            }}
          >
            {text.resetFilters}
          </button>
        </div>
      </section>

      {notice ? <p className={styles.inlineNote}>{notice}</p> : null}

      <div className={styles.workspaceLayout}>
        <section className={styles.ordersColumn}>
          <div className={styles.orderColumnHeader}>
            <h2 className={styles.workspaceTitle}>{text.regionsBoard}</h2>
            <p className={styles.workspaceMeta}>{text.ordersCount}: {visibleOrders.length}</p>
          </div>

          {groupedByRegion.length === 0 ? (
            <div className={styles.emptyState}>{text.noOrders}</div>
          ) : (
            <div className={styles.regionList}>
              {groupedByRegion.map((group) => {
                const isCollapsed = collapsedRegions[group.regionName] ?? false;
                return (
                  <article key={group.regionName} className={styles.regionCard}>
                    <button
                      type="button"
                      className={styles.regionHeaderButton}
                      onClick={() => setCollapsedRegions((current) => ({ ...current, [group.regionName]: !isCollapsed }))}
                    >
                      <span>{group.regionName}</span>
                      <span>{group.orders.length}</span>
                    </button>

                    {isCollapsed ? null : (
                      <div className={styles.ordersList}>
                        {group.orders.map((order) => {
                          const assignedEmployee = employees.find((employee) => employee.id === order.assignedEmployeeId);
                          return (
                            <article key={order.id} className={`${styles.orderCard} ${selectedOrder?.id === order.id ? styles.orderCardActive : ""}`}>
                              <div className={styles.orderHeader}>
                                <div>
                                  <h3 className={styles.orderTitle}>{order.id}</h3>
                                  <p className={styles.orderMeta}>{order.merchantName} • {order.customerName}</p>
                                </div>
                                <span className={styles.badge}>{deliveryStatusLabel[language][order.status]}</span>
                              </div>

                              <div className={styles.orderGrid}>
                                <div className={styles.miniCard}><strong>{text.storeName}</strong><span className={styles.workspaceMeta}>{order.merchantName}</span></div>
                                <div className={styles.miniCard}><strong>{text.shopOwner}</strong><span className={styles.workspaceMeta}>{order.merchantOwner}</span></div>
                                <div className={styles.miniCard}><strong>{text.phoneLabel}</strong><a href={order.merchantPhone === "-" ? undefined : `tel:${order.merchantPhone}`}>{order.merchantPhone}</a></div>
                                <div className={styles.miniCard}><strong>{text.address}</strong><span className={styles.workspaceMeta}>{order.merchantAddress}</span></div>
                                <div className={styles.miniCard}><strong>{text.region}</strong><span className={styles.workspaceMeta}>{order.customerRegion}</span></div>
                                <div className={styles.miniCard}><strong>{text.customerName}</strong><span className={styles.workspaceMeta}>{order.customerName}</span></div>
                                <div className={styles.miniCard}><strong>{text.phoneLabel}</strong><a href={order.customerPhone === "-" ? undefined : `tel:${order.customerPhone}`}>{order.customerPhone}</a></div>
                                <div className={styles.miniCard}><strong>{text.total}</strong><span className={styles.workspaceMeta}>{order.total}</span></div>
                                <div className={styles.miniCard}><strong>{text.payment}</strong><span className={styles.workspaceMeta}>{order.paymentMethod}</span></div>
                                <div className={styles.miniCard}><strong>{text.preparedAt}</strong><span className={styles.workspaceMeta}>{order.preparedAt}</span></div>
                                <div className={styles.miniCard}><strong>{text.assignedTo}</strong><span className={styles.workspaceMeta}>{assignedEmployee?.fullName ?? text.unassigned}</span></div>
                              </div>

                              <div className={styles.itemSummaryList}>
                                {order.items.map((item) => (
                                  <article key={`${order.id}-${item.title}`} className={styles.itemSummaryCard}>
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className={styles.itemSummaryImage} loading="lazy" /> : null}
                                    <p className={styles.detailText}>{item.title} × {item.quantity} • {item.size} • {item.color}</p>
                                  </article>
                                ))}
                              </div>

                              <div className={styles.actionRow}>
                                <button type="button" className={styles.primaryButton} onClick={() => setSelectedOrderId(order.id)}>{text.orderDetails}</button>
                                <a className={styles.secondaryButton} href={order.merchantPhone !== "-" ? `tel:${order.merchantPhone}` : undefined}>{text.callStore}</a>
                                <a className={styles.secondaryButton} href={order.customerPhone !== "-" ? `tel:${order.customerPhone}` : undefined}>{text.callCustomer}</a>
                                <a className={styles.secondaryButton} href={order.merchantMapsUrl} target="_blank" rel="noreferrer">{text.openStoreMap}</a>
                                <a className={styles.secondaryButton} href={order.customerMapsUrl} target="_blank" rel="noreferrer">{text.openCustomerMap}</a>
                              </div>

                              <div className={styles.actionRow}>
                                <button type="button" className={styles.statusButton} onClick={() => applyStatus(order, "picked_up")}>{text.receiveOrder}</button>
                                <button type="button" className={styles.statusButton} onClick={() => applyStatus(order, "out_for_delivery")}>{text.startDelivery}</button>
                                <button type="button" className={styles.statusButton} onClick={() => applyStatus(order, "delivered")}>{text.markDelivered}</button>
                                <button type="button" className={styles.statusButton} onClick={() => applyStatus(order, "cancelled")}>{text.reportIssue}</button>
                              </div>

                              {isAdminView ? (
                                <div className={styles.assignRow}>
                                  <select
                                    className={styles.inputSelect}
                                    value={draftAssignments[order.id] ?? ""}
                                    onChange={(event) => setDraftAssignments((current) => ({ ...current, [order.id]: event.target.value }))}
                                  >
                                    <option value="">{text.assignToEmployee}</option>
                                    {activeEmployees.map((employee) => (
                                      <option key={employee.id} value={employee.id}>{employee.fullName}</option>
                                    ))}
                                  </select>
                                  <button type="button" className={styles.secondaryButton} onClick={() => assignOrderToEmployee(order)}>{text.assign}</button>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className={styles.detailColumn}>
          {selectedOrder ? (
            <article className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.sectionTag}>{text.orderDetails}</p>
                  <h2 className={styles.detailTitle}>{selectedOrder.id}</h2>
                </div>
                <span className={styles.badge}>{deliveryStatusLabel[language][selectedOrder.status]}</span>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    const previous = visibleOrders[selectedOrderIndex - 1];
                    if (previous) {
                      setSelectedOrderId(previous.id);
                    }
                  }}
                >
                  {text.previousOrder}
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    const next = visibleOrders[selectedOrderIndex + 1];
                    if (next) {
                      setSelectedOrderId(next.id);
                    }
                  }}
                >
                  {text.nextOrder}
                </button>
              </div>

              <section className={styles.detailSection}>
                <header className={styles.detailSectionHeader}><h3>{text.shopSection}</h3></header>
                <dl className={styles.detailList}>
                  <div><dt>{text.storeName}</dt><dd>{selectedOrder.merchantName}</dd></div>
                  <div><dt>{text.shopOwner}</dt><dd>{selectedOrder.merchantOwner}</dd></div>
                  <div><dt>{text.phoneLabel}</dt><dd><a href={selectedOrder.merchantPhone === "-" ? undefined : `tel:${selectedOrder.merchantPhone}`}>{selectedOrder.merchantPhone}</a></dd></div>
                  <div><dt>{text.address}</dt><dd>{selectedOrder.merchantAddress}</dd></div>
                  <div><dt>{text.region}</dt><dd>{selectedOrder.merchantRegion}</dd></div>
                  <div><dt>{text.location}</dt><dd><a href={selectedOrder.merchantMapsUrl} target="_blank" rel="noreferrer">{text.openStoreMap}</a></dd></div>
                </dl>
              </section>

              <section className={styles.detailSection}>
                <header className={styles.detailSectionHeader}><h3>{text.customerSection}</h3></header>
                <dl className={styles.detailList}>
                  <div><dt>{text.customerName}</dt><dd>{selectedOrder.customerName}</dd></div>
                  <div><dt>{text.phoneLabel}</dt><dd><a href={selectedOrder.customerPhone === "-" ? undefined : `tel:${selectedOrder.customerPhone}`}>{selectedOrder.customerPhone}</a></dd></div>
                  <div><dt>{text.address}</dt><dd>{selectedOrder.customerAddress}</dd></div>
                  <div><dt>{text.region}</dt><dd>{selectedOrder.customerRegion}</dd></div>
                  <div><dt>{text.location}</dt><dd><a href={selectedOrder.customerMapsUrl} target="_blank" rel="noreferrer">{text.openCustomerMap}</a></dd></div>
                </dl>
              </section>

              <section className={styles.detailSection}>
                <header className={styles.detailSectionHeader}><h3>{text.orderSection}</h3></header>
                <dl className={styles.detailList}>
                  <div><dt>{text.orderId}</dt><dd>{selectedOrder.id}</dd></div>
                  <div><dt>{text.products}</dt><dd>{selectedOrder.items.map((item) => `${item.title} (${item.size} • ${item.color})`).join(" • ") || "-"}</dd></div>
                  <div><dt>{text.quantities}</dt><dd>{selectedOrder.items.map((item) => `${item.quantity} × ${item.unitPrice}`).join(" • ") || "-"}</dd></div>
                  <div><dt>{text.total}</dt><dd>{selectedOrder.total}</dd></div>
                  <div><dt>{text.payment}</dt><dd>{selectedOrder.paymentMethod}</dd></div>
                  <div><dt>{text.paymentStatus}</dt><dd>{selectedOrder.paymentStatus}</dd></div>
                  <div><dt>{text.notes}</dt><dd>{selectedOrder.notes}</dd></div>
                  <div><dt>{text.createdAt}</dt><dd>{selectedOrder.createdAt}</dd></div>
                  <div><dt>{text.preparedAt}</dt><dd>{selectedOrder.preparedAt}</dd></div>
                  <div><dt>{text.pickedUpAt}</dt><dd>{selectedOrder.pickedUpAt}</dd></div>
                  <div><dt>{text.deliveredAt}</dt><dd>{selectedOrder.deliveredAt}</dd></div>
                </dl>
              </section>

              <section className={styles.detailSection}>
                <header className={styles.detailSectionHeader}><h3>{text.quickActions}</h3></header>
                <div className={styles.actionRow}>
                  <a className={styles.secondaryButton} href={selectedOrder.merchantPhone !== "-" ? `tel:${selectedOrder.merchantPhone}` : undefined}>{text.callStore}</a>
                  <a className={styles.secondaryButton} href={selectedOrder.customerPhone !== "-" ? `tel:${selectedOrder.customerPhone}` : undefined}>{text.callCustomer}</a>
                  <a className={styles.secondaryButton} href={selectedOrder.merchantMapsUrl} target="_blank" rel="noreferrer">{text.openStoreMap}</a>
                  <a className={styles.secondaryButton} href={selectedOrder.customerMapsUrl} target="_blank" rel="noreferrer">{text.openCustomerMap}</a>
                  <button type="button" className={styles.statusButton} onClick={() => applyStatus(selectedOrder, "picked_up")}>{text.receiveOrder}</button>
                  <button type="button" className={styles.statusButton} onClick={() => applyStatus(selectedOrder, "out_for_delivery")}>{text.startDelivery}</button>
                  <button type="button" className={styles.statusButton} onClick={() => applyStatus(selectedOrder, "delivered")}>{text.markDelivered}</button>
                  <button type="button" className={styles.statusButton} onClick={() => applyStatus(selectedOrder, "cancelled")}>{text.reportIssue}</button>
                </div>
              </section>

              {isAdminView ? (
                <section className={styles.detailSection}>
                  <header className={styles.detailSectionHeader}><h3>{text.updateStatus}</h3></header>
                  <div className={styles.actionRow}>
                    {DELIVERY_STATUSES.map((status) => (
                      <button key={status} type="button" className={styles.statusButton} onClick={() => applyStatus(selectedOrder, status)}>
                        {deliveryStatusLabel[language][status]}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </article>
          ) : (
            <div className={styles.emptyState}>{text.noOrders}</div>
          )}
        </aside>
      </div>

      {isAdminView ? (
        <section className={styles.panel}>
          <header className={styles.detailSectionHeader}>
            <h2 className={styles.workspaceTitle}>{text.employeeManagement}</h2>
          </header>

          <div className={styles.employeeFormGrid}>
            <input className={styles.inputField} value={employeeForm.fullName} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder={text.fullName} />
            <input className={styles.inputField} value={employeeForm.email} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, email: event.target.value }))} placeholder={text.username} />
            <input className={styles.inputField} value={employeeForm.password} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, password: event.target.value }))} placeholder={text.password} />
            <input className={styles.inputField} value={employeeForm.phone} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder={text.employeePhone} />
            <input className={styles.inputField} value={employeeForm.region} onChange={(event) => setEmployeeForm((prev) => ({ ...prev, region: event.target.value }))} placeholder={text.employeeRegion} />
            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={saveEmployee}>{editingEmployeeId ? text.editEmployee : text.addEmployee}</button>
              {editingEmployeeId ? <button type="button" className={styles.secondaryButton} onClick={resetEmployeeForm}>{text.cancelEdit}</button> : null}
            </div>
          </div>

          <div className={styles.employeeList}>
            {employees.map((employee) => (
              <article key={employee.id} className={styles.employeeCard}>
                <div>
                  <h3 className={styles.orderTitle}>{employee.fullName}</h3>
                  <p className={styles.orderMeta}>{employee.email}</p>
                </div>
                <div className={styles.employeeMetaGrid}>
                  <span>{text.employeePhone}: {employee.phone}</span>
                  <span>{text.region}: {employee.region}</span>
                  <span>{text.employeeOrders}: {employeeLoad[employee.id] ?? 0}</span>
                  <span>{text.status}: {employee.status}</span>
                </div>
                <div className={styles.actionRow}>
                  <button type="button" className={styles.secondaryButton} onClick={() => editEmployee(employee)}>{text.editEmployee}</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => toggleEmployeeStatus(employee.id)}>{employee.status === "active" ? text.disableEmployee : text.enableEmployee}</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => deleteEmployee(employee.id)}>{text.deleteEmployee}</button>
                  <button type="button" className={styles.secondaryButton} onClick={() => setEmployeeFilter(employee.id)}>{text.employeeOrders}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RoleSelectionScreen({
  language,
  onChoose,
}: {
  language: AppLanguage;
  onChoose: (type: AccountType) => void;
}) {
  const text = language === "en" ? copy.en : copy.ar;
  return (
    <div className={styles.shell} dir={language === "en" ? "ltr" : "rtl"}>
      <div className={styles.loginShell}>
        <section className={styles.loginCard}>
          <p className={styles.brand}>BAMORA BUSINESS</p>
          <h1 className={styles.title}>{text.pickRoleTitle}</h1>
          <p className={styles.subtitle}>{text.pickRoleSubtitle}</p>
          <div className={styles.pickerGrid}>
            <button type="button" className={styles.pickerButton} onClick={() => onChoose("delivery")}>{text.chooseDelivery}</button>
            <button type="button" className={styles.pickerButton} onClick={() => onChoose("merchant")}>{text.chooseMerchant}</button>
            <button type="button" className={styles.pickerButton} onClick={() => onChoose("super-admin")}>{text.chooseAdmin}</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  const [language, setLanguage] = useState<AppLanguage>("ar");
  const [role, setRole] = useState<BusinessRole | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [username, setUsername] = useState("");
  const [merchantCode, setMerchantCode] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");

  const text = language === "en" ? copy.en : copy.ar;

  useEffect(() => {
    setLanguage(getSavedLanguage());
    sanitizeLegacyDeliveryEmployees();

    const currentRole = getCurrentRole();
    if (currentRole === "merchant") {
      setRole("merchant");
      setWorkspace("merchant");
      setAccountType("merchant");
      if (canUseStorage()) {
        setUsername(window.localStorage.getItem(MERCHANT_NAME_KEY) ?? "");
      }
      return;
    }

    if (currentRole === "super-admin") {
      setRole("super-admin");
      setWorkspace("admin");
      setAccountType("super-admin");
      if (canUseStorage()) {
        setUsername(window.localStorage.getItem(ADMIN_NAME_KEY) ?? "");
      }
      return;
    }

    if (canUseStorage() && window.localStorage.getItem(DELIVERY_ROLE_KEY) === "delivery") {
      setRole("delivery");
      setWorkspace("delivery");
      setAccountType("delivery");
      setUsername(window.localStorage.getItem(DELIVERY_USER_KEY) ?? "");
    }
  }, []);

  useEffect(() => {
    if (!role) {
      return;
    }

    const syncRole = () => {
      const current = getCurrentRole();
      if (role === "delivery") {
        return;
      }

      if (!current) {
        setRole(null);
        setWorkspace(null);
        setAccountType(null);
        setUsername("");
        setPassword("");
        setNotice("");
      }
    };

    const intervalId = window.setInterval(syncRole, 800);
    window.addEventListener("focus", syncRole);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncRole);
    };
  }, [role]);

  const handleLogout = () => {
    clearBusinessSession();
    clearRoleSession();
    setRole(null);
    setWorkspace(null);
    setAccountType(null);
    setUsername("");
    setMerchantCode("");
    setPassword("");
    setNotice("");
  };

  const handleLogin = async () => {
    setNotice("");
    const normalizedUsername = username.trim();
    const normalizedPassword = password.trim();

    if (!accountType) {
      return;
    }

    if (accountType === "delivery") {
      const deliveryEmployees = readJsonStorage<DeliveryEmployee[]>(DELIVERY_EMPLOYEES_KEY, []);
      const matchedDeliveryUser = authenticateDeliveryUser(normalizedUsername, normalizedPassword, deliveryEmployees);
      if (!matchedDeliveryUser) {
        setNotice(text.accessDenied);
        return;
      }

      clearRoleSession();
      clearBusinessSession();

      try {
        await establishAdminApiSession(undefined, ADMIN_API_PASSWORD || undefined);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : text.accessDenied);
        return;
      }
      persistDeliverySession(matchedDeliveryUser);
      setRole("delivery");
      setWorkspace("delivery");
      return;
    }

    if (accountType === "super-admin") {
      if (!normalizedUsername || !normalizedPassword) {
        setNotice(text.accessDenied);
        return;
      }

      clearBusinessSession();
      clearRoleSession();

      try {
        await establishAdminApiSession(normalizedUsername.toLowerCase(), normalizedPassword);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : text.accessDenied);
        return;
      }
      setCurrentRole("super-admin");
      if (canUseStorage()) {
        window.localStorage.setItem(ADMIN_NAME_KEY, normalizedUsername.toLowerCase());
      }
      persistBusinessWorkspace("admin");
      setRole("super-admin");
      setWorkspace("admin");
      return;
    }

    try {
      const merchantEmail = normalizedUsername.toLowerCase();
      const merchantPhone = normalizePhone(merchantCode.trim());
      const merchantLoginCode = normalizedPassword;

      if (!merchantEmail || !merchantPhone || merchantLoginCode !== merchantPhone.slice(-4)) {
        setNotice(text.wrongMerchantCredentials);
        return;
      }

      clearBusinessSession();
      clearRoleSession();

      const session = await merchantRepository.login({
        email: merchantEmail,
        password: merchantLoginCode,
        loginCode: merchantPhone,
      });
      setCurrentRole("merchant");
      if (canUseStorage()) {
        window.localStorage.setItem(MERCHANT_NAME_KEY, session.email);
      }
      persistBusinessWorkspace("merchant");
      setRole("merchant");
      setWorkspace("merchant");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : text.wrongMerchantCredentials);
    }
  };

  const loginTitle = useMemo(() => {
    if (accountType === "delivery") {
      return text.chooseDelivery;
    }
    if (accountType === "merchant") {
      return text.chooseMerchant;
    }
    if (accountType === "super-admin") {
      return text.chooseAdmin;
    }
    return text.appTitle;
  }, [accountType, text.appTitle, text.chooseAdmin, text.chooseDelivery, text.chooseMerchant]);

  if (!role || !workspace) {
    if (!accountType) {
      return <RoleSelectionScreen language={language} onChoose={(next) => setAccountType(next)} />;
    }

    return (
      <div className={styles.shell} dir={language === "en" ? "ltr" : "rtl"}>
        <div className={styles.loginShell}>
          <section className={styles.loginCard}>
            <p className={styles.brand}>BAMORA BUSINESS</p>
            <h1 className={styles.title}>{loginTitle}</h1>
            <p className={styles.subtitle}>{text.continueToLogin}</p>
            <div className={styles.fieldGrid}>
              <input
                className={styles.inputField}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={accountType === "merchant" || accountType === "super-admin" ? text.email : text.username}
              />
              {accountType === "merchant" ? (
                <input
                  className={styles.inputField}
                  value={merchantCode}
                  onChange={(event) => setMerchantCode(event.target.value)}
                  placeholder={text.merchantPhoneHint}
                />
              ) : null}
              <input
                className={styles.inputField}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={accountType === "merchant" ? text.merchantPasswordHint : text.password}
              />
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.primaryButton} onClick={() => void handleLogin()}>{text.login}</button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setAccountType(null);
                  setUsername("");
                  setMerchantCode("");
                  setPassword("");
                  setNotice("");
                }}
              >
                {text.backToRoleSelect}
              </button>
            </div>
            {notice ? <p className={styles.inlineNote}>{notice}</p> : null}
          </section>
        </div>
      </div>
    );
  }

  if (role === "delivery") {
    if (workspace !== "delivery") {
      return (
        <div className={styles.shell} dir={language === "en" ? "ltr" : "rtl"}>
          <div className={styles.loginShell}>
            <section className={styles.loginCard}>
              <p className={styles.inlineNote}>{text.roleNotAllowed}</p>
              <button type="button" className={styles.secondaryButton} onClick={() => setWorkspace("delivery")}>{text.chooseDelivery}</button>
              <button type="button" className={styles.secondaryButton} onClick={handleLogout}>{text.logout}</button>
            </section>
          </div>
        </div>
      );
    }
    return <DeliveryWorkspace language={language} isAdminView={false} onLogout={handleLogout} />;
  }

  if (role === "merchant") {
    if (workspace !== "merchant") {
      return (
        <div className={styles.shell} dir={language === "en" ? "ltr" : "rtl"}>
          <div className={styles.loginShell}>
            <section className={styles.loginCard}>
              <p className={styles.inlineNote}>{text.roleNotAllowed}</p>
              <button type="button" className={styles.secondaryButton} onClick={() => setWorkspace("merchant")}>{text.chooseMerchant}</button>
              <button type="button" className={styles.secondaryButton} onClick={handleLogout}>{text.logout}</button>
            </section>
          </div>
        </div>
      );
    }
    return <MerchantPage />;
  }

  if (role === "super-admin") {
    if (workspace === "delivery") {
      return (
        <div className={styles.workspaceFrame}>
          <div className={styles.floatingBar}>
            <button type="button" className={styles.secondaryButton} onClick={() => setWorkspace("admin")}>{text.adminWorkspace}</button>
            <button type="button" className={styles.secondaryButton} onClick={handleLogout}>{text.logout}</button>
          </div>
          <DeliveryWorkspace language={language} isAdminView={true} onLogout={handleLogout} />
        </div>
      );
    }

    return (
      <div className={styles.workspaceFrame}>
        <div className={styles.floatingBar}>
          <button type="button" className={styles.secondaryButton} onClick={() => setWorkspace("delivery")}>{text.chooseDelivery}</button>
          <button type="button" className={styles.secondaryButton} onClick={handleLogout}>{text.logout}</button>
        </div>
        <AdminPage />
      </div>
    );
  }

  return null;
}