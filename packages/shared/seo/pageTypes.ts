/**
 * @module @seosh/shared/seo/pageTypes
 * @description Canonical page type taxonomy for SEOSH.AI.
 *
 * Every content plan row gets one of these page types.
 * Each type carries default values for Schema.org, target word count,
 * and expected number of H2 headings — auto-filled in the Content Planner.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageTypeDefinition {
  /** Machine-readable slug stored in ContentItem.pageType */
  slug: string;
  /** Human-readable label (EN) */
  label: string;
  /** Human-readable label (RU) */
  labelRu: string;
  /** Short description */
  description: string;
  /** Default Schema.org type for JSON-LD */
  defaultSchema: string;
  /** Recommended word count for the page body */
  defaultWordCount: number;
  /** Expected number of H2 sub-sections */
  expectedH2Count: number;
  /** Default priority (1 = highest, 5 = lowest) */
  defaultPriority: number;
  /** Which sections typically use this page type */
  typicalSections: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PAGE_TYPES: PageTypeDefinition[] = [
  {
    slug: "homepage",
    label: "Homepage",
    labelRu: "Главная страница",
    description: "Main landing page of the website",
    defaultSchema: "LocalBusiness",
    defaultWordCount: 2500,
    expectedH2Count: 4,
    defaultPriority: 1,
    typicalSections: ["Главная", "Home"],
  },
  {
    slug: "service_listing",
    label: "Service Listing",
    labelRu: "Список услуг",
    description: "Category page listing all services in a group",
    defaultSchema: "Service",
    defaultWordCount: 2000,
    expectedH2Count: 4,
    defaultPriority: 2,
    typicalSections: ["Услуги", "Services"],
  },
  {
    slug: "service_detail",
    label: "Service Detail",
    labelRu: "Страница услуги",
    description: "Individual service page with full description",
    defaultSchema: "Service",
    defaultWordCount: 3000,
    expectedH2Count: 4,
    defaultPriority: 1,
    typicalSections: ["Услуги", "Services"],
  },
  {
    slug: "product_listing",
    label: "Product Listing",
    labelRu: "Каталог товаров",
    description: "Category page listing products",
    defaultSchema: "ItemList",
    defaultWordCount: 2000,
    expectedH2Count: 3,
    defaultPriority: 2,
    typicalSections: ["Продукция", "Products", "Каталог"],
  },
  {
    slug: "product_detail",
    label: "Product Detail",
    labelRu: "Карточка товара",
    description: "Individual product page",
    defaultSchema: "Product",
    defaultWordCount: 2000,
    expectedH2Count: 3,
    defaultPriority: 2,
    typicalSections: ["Продукция", "Products", "Каталог"],
  },
  {
    slug: "landing_page",
    label: "Landing Page",
    labelRu: "Лендинг",
    description: "High-intent conversion page (method, technique, campaign)",
    defaultSchema: "Service",
    defaultWordCount: 3000,
    expectedH2Count: 4,
    defaultPriority: 1,
    typicalSections: ["Услуги", "Services", "Методы"],
  },
  {
    slug: "blog_listing",
    label: "Blog Index",
    labelRu: "Список статей блога",
    description: "Blog archive / index page",
    defaultSchema: "Blog",
    defaultWordCount: 500,
    expectedH2Count: 0,
    defaultPriority: 3,
    typicalSections: ["Блог", "Blog"],
  },
  {
    slug: "blog_post",
    label: "Blog Post",
    labelRu: "Статья блога",
    description: "Individual blog article for content marketing",
    defaultSchema: "Article",
    defaultWordCount: 1200,
    expectedH2Count: 4,
    defaultPriority: 4,
    typicalSections: ["Блог", "Blog"],
  },
  {
    slug: "promo_listing",
    label: "Promotions Index",
    labelRu: "Список акций",
    description: "Page listing all active promotions",
    defaultSchema: "OfferCatalog",
    defaultWordCount: 500,
    expectedH2Count: 2,
    defaultPriority: 5,
    typicalSections: ["Акции", "Promotions", "Скидки"],
  },
  {
    slug: "promo_detail",
    label: "Promotion Detail",
    labelRu: "Страница акции",
    description: "Individual promotion / offer page",
    defaultSchema: "Offer",
    defaultWordCount: 1000,
    expectedH2Count: 2,
    defaultPriority: 5,
    typicalSections: ["Акции", "Promotions", "Скидки"],
  },
  {
    slug: "info_page",
    label: "Info Page",
    labelRu: "Информационная страница",
    description: "About, Delivery, FAQ, Contacts, Terms",
    defaultSchema: "WebPage",
    defaultWordCount: 1500,
    expectedH2Count: 3,
    defaultPriority: 3,
    typicalSections: ["Информация", "О нас", "Info", "About"],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Map slug → definition for O(1) access */
export const PAGE_TYPE_MAP = new Map(PAGE_TYPES.map((pt) => [pt.slug, pt]));

/** Get the default Schema.org type for a given page type slug */
export function getDefaultSchema(pageTypeSlug: string): string {
  return PAGE_TYPE_MAP.get(pageTypeSlug)?.defaultSchema ?? "WebPage";
}

/** Get the default target word count for a given page type slug */
export function getDefaultWordCount(pageTypeSlug: string): number {
  return PAGE_TYPE_MAP.get(pageTypeSlug)?.defaultWordCount ?? 1000;
}

/** Get the default priority for a given page type slug */
export function getDefaultPriority(pageTypeSlug: string): number {
  return PAGE_TYPE_MAP.get(pageTypeSlug)?.defaultPriority ?? 3;
}

/**
 * Guess the best page type slug from a section name.
 * Uses the `typicalSections` array for fuzzy matching.
 */
export function guessPageTypeFromSection(sectionName: string): string {
  const lower = sectionName.toLowerCase();
  for (const pt of PAGE_TYPES) {
    for (const s of pt.typicalSections) {
      if (lower.includes(s.toLowerCase()) || s.toLowerCase().includes(lower)) {
        return pt.slug;
      }
    }
  }
  return "info_page"; // safe fallback
}

/** Dropdown options for UI selectors */
export function getPageTypeOptions(): Array<{ value: string; label: string }> {
  return PAGE_TYPES.map((pt) => ({
    value: pt.slug,
    label: `${pt.label} (${pt.labelRu})`,
  }));
}
