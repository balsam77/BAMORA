export type DynamicCategory = {
  id: string;
  titleAr: string;
  icon: string;
};

const STORAGE_KEY = "bamoraMerchantCategories";
const CATEGORIES_API_ENDPOINT = "/api/catalog/categories";

const defaultCategories: DynamicCategory[] = [
  { id: "women", titleAr: "نسائي", icon: "👗" },
  { id: "men", titleAr: "رجالي", icon: "🤵" },
  { id: "kids", titleAr: "أطفال", icon: "🧒" },
  { id: "home", titleAr: "منزلي", icon: "🏠" },
  { id: "electronics", titleAr: "إلكترونيات", icon: "📱" },
  { id: "sports", titleAr: "رياضة", icon: "🏃" },
  { id: "fragrance", titleAr: "عطور", icon: "🧴" },
  { id: "accessories", titleAr: "إكسسوارات", icon: "👜" },
];

function normalizeId(value: string, fallbackIndex: number) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `category-${fallbackIndex + 1}`;
}

function sanitizeCategory(input: unknown, index: number): DynamicCategory | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const titleAr = typeof raw.titleAr === "string"
    ? raw.titleAr.trim()
    : typeof raw.name === "string"
      ? raw.name.trim()
      : "";

  if (!titleAr) {
    return null;
  }

  const idSource = typeof raw.id === "string"
    ? raw.id
    : typeof raw.slug === "string"
      ? raw.slug
      : titleAr;

  const icon = typeof raw.icon === "string" && raw.icon.trim().length > 0
    ? raw.icon.trim()
    : "🛍️";

  return {
    id: normalizeId(idSource, index),
    titleAr,
    icon,
  };
}

function sanitizeCategories(input: unknown): DynamicCategory[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const categories = input
    .map((item, index) => sanitizeCategory(item, index))
    .filter((item): item is DynamicCategory => item !== null);

  if (categories.length === 0) {
    return [];
  }

  const deduped = new Map<string, DynamicCategory>();
  for (const category of categories) {
    if (!deduped.has(category.id)) {
      deduped.set(category.id, category);
    }
  }

  return Array.from(deduped.values());
}

export function getDefaultCategories(): DynamicCategory[] {
  return defaultCategories;
}

export function getCategoriesFromStorage(): DynamicCategory[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return sanitizeCategories(parsed);
  } catch {
    return [];
  }
}

async function getCategoriesFromApi(): Promise<DynamicCategory[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const response = await fetch(CATEGORIES_API_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const parsed = await response.json();
    return sanitizeCategories(parsed);
  } catch {
    return [];
  }
}

export async function resolveDynamicCategories(): Promise<DynamicCategory[]> {
  const fromApi = await getCategoriesFromApi();
  if (fromApi.length > 0) {
    return fromApi;
  }

  const fromStorage = getCategoriesFromStorage();
  if (fromStorage.length > 0) {
    return fromStorage;
  }

  return getDefaultCategories();
}
