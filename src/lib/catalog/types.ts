import type { StoreSectionType, TemplateKey } from "@prisma/client";

export type PublicTenant = {
  name: string;
  slug: string;
};

export type PublicTheme = {
  template: TemplateKey;
  config: {
    accentColor?: string;
  };
};

type PublicStoreSectionBase<
  TType extends StoreSectionType,
  TContent extends Record<string, unknown>,
> = {
  type: TType;
  position: number;
  content: TContent;
};

export type PublicHeroSection = PublicStoreSectionBase<
  "HERO",
  {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
    imageUrl?: string;
    imageAlt?: string;
  }
>;

export type PublicCategoriesSection = PublicStoreSectionBase<
  "CATEGORIES",
  { title?: string }
>;

export type PublicProductFeedSection = PublicStoreSectionBase<
  "PRODUCT_FEED",
  { title?: string; limit?: number }
>;

export type PublicPromotionsSection = PublicStoreSectionBase<
  "PROMOTIONS",
  {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaHref?: string;
  }
>;

export type PublicTestimonialsSection = PublicStoreSectionBase<
  "TESTIMONIALS",
  { title?: string }
>;

export type PublicStoreSection =
  | PublicHeroSection
  | PublicCategoriesSection
  | PublicProductFeedSection
  | PublicPromotionsSection
  | PublicTestimonialsSection;

export type PublicCategory = {
  name: string;
  slug: string;
  position: number;
};

export type PublicProductVariant = {
  sku: string;
  size: string;
  color: string;
  stock: number;
  price: string | null;
};

export type PublicProductImage = {
  url: string;
  altText: string | null;
};

export type PublicProduct = {
  name: string;
  slug: string;
  description: string | null;
  categorySlug: string;
  price: string;
  compareAtPrice: string | null;
  variants: PublicProductVariant[];
  images: PublicProductImage[];
};

export type PublicStoreSettings = {
  name: string;
  whatsAppNumber: string | null;
  texts: {
    announcement?: string;
  };
};

export type PublicStoreData = {
  tenant: PublicTenant;
  theme: PublicTheme | null;
  sections: PublicStoreSection[];
  categories: PublicCategory[];
  products: PublicProduct[];
  settings: PublicStoreSettings;
};
