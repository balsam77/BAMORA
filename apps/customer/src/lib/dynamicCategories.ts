export type DynamicCategory = {
  id: string;
  titleAr: string;
  icon: string;
  parentId?: string | null;
};

const STORAGE_KEY = "bamoraMerchantCategories";
const CATEGORIES_API_ENDPOINT = `${process.env.NEXT_PUBLIC_BAMORA_API_URL ?? "http://127.0.0.1:4001"}/api/catalog/categories`;

const defaultCategories: DynamicCategory[] = [
  { id: "women", titleAr: "نسائي", icon: "👗" },
  { id: "dresses", titleAr: "فساتين", icon: "👗", parentId: "women" },
  { id: "men", titleAr: "رجالي", icon: "🤵" },
  { id: "kids", titleAr: "أطفال", icon: "🧒" },
  { id: "accessories", titleAr: "إكسسوارات", icon: "👜" },
  { id: "bags", titleAr: "حقائب", icon: "👜", parentId: "accessories" },
  { id: "shoes", titleAr: "أحذية", icon: "👟", parentId: "accessories" },
  { id: "glasses", titleAr: "نظارات", icon: "🕶️", parentId: "accessories" },
  { id: "beauty", titleAr: "الجمال والعناية", icon: "💄" },
  { id: "makeup", titleAr: "مكياج", icon: "💄", parentId: "beauty" },
  { id: "perfumes", titleAr: "عطور", icon: "🧴", parentId: "beauty" },
  { id: "home", titleAr: "منزلي", icon: "🏠" },
  { id: "electronics", titleAr: "إلكترونيات", icon: "📱" },
  { id: "sports", titleAr: "رياضة", icon: "🏃" },
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

  const idSource = typeof raw.id === "string"
    ? raw.id
    : typeof raw.slug === "string"
      ? raw.slug
      : titleAr;

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

  return {
    id: normalizeId(idSource, index),
    titleAr,
    icon,
    parentId:
      typeof parentCandidate === "string" && parentCandidate.trim().length > 0
        ? normalizeId(parentCandidate, index)
        : null,
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
