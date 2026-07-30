import type { PublicStoreData } from "@/lib/catalog/types";

export type AppearanceTemplateKey =
  | "MODABELLA"
  | "TEMPLATE_02"
  | "TEMPLATE_03"
  | "TEMPLATE_04";

export type AppearanceDraftValue = {
  template: AppearanceTemplateKey;
  theme: {
    storeName: string;
    accentColor: string;
    announcement: string;
    whatsAppNumber: string;
  };
  sections: {
    hero: {
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaHref: string;
      imageUrl: string;
    };
    categories: {
      title: string;
      enabled: boolean;
    };
    productFeed: {
      title: string;
      limit: number;
      enabled: boolean;
    };
  };
};

export type AppearanceCapabilities = {
  canEdit: boolean;
  canPublish: boolean;
  templates: Array<{ key: AppearanceTemplateKey; available: boolean }>;
};

export type AppearanceResponse = {
  draft: AppearanceDraftValue;
  published: AppearanceDraftValue;
  publishedAt: string | null;
  capabilities: AppearanceCapabilities;
};

export type AppearancePreviewCatalog = Pick<PublicStoreData, "categories" | "products">;
