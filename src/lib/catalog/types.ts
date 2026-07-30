import type { Prisma, StoreSectionType, TemplateKey } from "@prisma/client";

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

export type PublicStoreSection = {
  type: StoreSectionType;
  position: number;
  content: Prisma.JsonValue;
};

export type PublicCategory = {
  name: string;
  slug: string;
  position: number;
};

export type PublicProductVariant = {
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
