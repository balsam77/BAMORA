import { getApiBaseUrl } from "@bamora/platform";

export type DynamicCategory = {
  id: string;
  titleAr: string;
  titleEn?: string;
  titleHe?: string | null;
  icon: string;
  parentId?: string | null;
  sortOrder?: number;
};

const STORAGE_KEY = "bamoraMerchantCategories";

const defaultCategories: DynamicCategory[] = [
  { id: "women", titleAr: "نسائي", icon: "👗" },
  { id: "women-dresses", titleAr: "فساتين", icon: "👗", parentId: "women" },
  { id: "men", titleAr: "رجالي", icon: "🤵" },
  { id: "kids-babies", titleAr: "أطفال ومواليد", icon: "🧒" },
  { id: "bags", titleAr: "حقائب", icon: "👜" },
  { id: "shoes", titleAr: "أحذية", icon: "👟" },
  { id: "accessories", titleAr: "إكسسوارات", icon: "💍" },
  { id: "accessories-sunglasses", titleAr: "نظارات شمسية", icon: "🕶️", parentId: "accessories" },
  { id: "beauty-care", titleAr: "مستحضرات تجميل وعناية", icon: "💄" },
  { id: "beauty-makeup", titleAr: "مكياج", icon: "💄", parentId: "beauty-care" },
  { id: "beauty-women-perfume", titleAr: "عطور نسائية", icon: "🧴", parentId: "beauty-care" },
  { id: "home-kitchen", titleAr: "المنزل والمطبخ", icon: "🏠" },
  { id: "electronics", titleAr: "إلكترونيات", icon: "📱" },
  { id: "sports-fitness", titleAr: "رياضة ولياقة", icon: "🏃" },
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
    : typeof raw.nameAr === "string"
      ? raw.nameAr.trim()
      : typeof raw.name === "string"
        ? raw.name.trim()
        : typeof raw.title === "string"
          ? raw.title.trim()
          : "";

  if (!titleAr) {
    return null;
  }

  const titleEn = typeof raw.titleEn === "string" ? raw.titleEn.trim()
    : typeof raw.nameEn === "string" ? raw.nameEn.trim() : undefined;
  const titleHe = typeof raw.titleHe === "string" ? raw.titleHe.trim()
    : typeof raw.nameHe === "string" ? raw.nameHe.trim() : null;

  // Keep the raw ID as-is so parent-child links from the API stay intact.
  const idSource = typeof raw.id === "string" && raw.id.trim().length > 0
    ? raw.id.trim()
    : typeof raw.slug === "string" && raw.slug.trim().length > 0
      ? raw.slug.trim()
      : normalizeId(titleAr, index);

  const icon = typeof raw.icon === "string" && raw.icon.trim().length > 0
    ? raw.icon.trim()
    : "🛍️";

  const parentCandidate =
    typeof raw.parentId === "string"
      ? raw.parentId
      : typeof raw.parent === "string"
        ? raw.parent
        : raw.parent && typeof raw.parent === "object" && typeof (raw.parent as Record<string, unknown>).id === "string"
          ? ((raw.parent as Record<string, unknown>).id as string)
          : null;

  const sortOrder = typeof raw.sortOrder === "number" ? raw.sortOrder : undefined;

  return {
    id: idSource,
    titleAr,
    titleEn,
    titleHe,
    icon,
    parentId:
      typeof parentCandidate === "string" && parentCandidate.trim().length > 0
        ? parentCandidate.trim()
        : null,
    sortOrder,
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
    const response = await fetch(`${getApiBaseUrl()}/api/catalog/categories`, { cache: "no-store" });
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
