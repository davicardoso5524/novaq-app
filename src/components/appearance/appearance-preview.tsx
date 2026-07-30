"use client";

import type { CSSProperties } from "react";
import { ModaBellaStore } from "@/templates/modabella/modabella-store";
import type { PublicStoreData } from "@/lib/catalog/types";
import type { AppearanceDraftValue, AppearancePreviewCatalog } from "./types";

type AppearancePreviewProps = {
  draft: AppearanceDraftValue;
  catalog: AppearancePreviewCatalog;
  title?: string;
};

type PreviewStyle = CSSProperties & { "--store-accent": string };

function buildPreviewStore(
  draft: AppearanceDraftValue,
  catalog: AppearancePreviewCatalog,
): PublicStoreData {
  const sections: PublicStoreData["sections"] = [
    {
      type: "HERO",
      position: 0,
      content: {
        title: draft.sections.hero.title,
        subtitle: draft.sections.hero.subtitle,
        ctaLabel: draft.sections.hero.ctaLabel,
        ctaHref: draft.sections.hero.ctaHref,
        imageUrl: draft.sections.hero.imageUrl,
      },
    },
  ];

  if (draft.sections.categories.enabled) {
    sections.push({
      type: "CATEGORIES",
      position: 1,
      content: { title: draft.sections.categories.title },
    });
  }

  if (draft.sections.productFeed.enabled) {
    sections.push({
      type: "PRODUCT_FEED",
      position: 2,
      content: {
        title: draft.sections.productFeed.title,
        limit: draft.sections.productFeed.limit,
      },
    });
  }

  return {
    tenant: {
      name: draft.theme.storeName,
      slug: "preview",
    },
    theme: {
      template: draft.template,
      config: {
        accentColor: draft.theme.accentColor,
      },
    },
    sections,
    categories: catalog.categories,
    products: catalog.products,
    settings: {
      name: draft.theme.storeName,
      whatsAppNumber: draft.theme.whatsAppNumber,
      texts: draft.theme.announcement
        ? { announcement: draft.theme.announcement }
        : {},
    },
  };
}

export function AppearancePreview({
  draft,
  catalog,
  title = "Preview da loja",
}: AppearancePreviewProps) {
  const preview = buildPreviewStore(draft, catalog);
  const style: PreviewStyle = { "--store-accent": draft.theme.accentColor };

  return (
    <section
      aria-label={title}
      data-testid="appearance-phone-preview"
      style={style}
      className="overflow-hidden rounded-[2rem] border-[10px] border-slate-950 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.6)]"
    >
      <div className="mx-auto h-7 w-32 rounded-b-[1rem] bg-slate-950" aria-hidden="true" />
      <div className="max-h-[720px] overflow-auto bg-[#f8f5ff]">
        <ModaBellaStore data={preview} />
      </div>
    </section>
  );
}
