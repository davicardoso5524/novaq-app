import { ProductStatus, StoreSectionType, type Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { resolveTenantFromHost } from "../tenant/resolve";
import type { PublicStoreData, PublicStoreSection } from "./types";
import { sanitizePublicImageUrl } from "./public-image-url";

function readPublicString(
  config: Prisma.JsonValue,
  key:
    | "storeName"
    | "whatsAppNumber"
    | "accentColor"
    | "announcement"
    | "title"
    | "subtitle"
    | "ctaLabel"
    | "ctaHref"
    | "imageUrl"
    | "imageAlt",
): string | undefined {
  if (!config || Array.isArray(config) || typeof config !== "object") return undefined;

  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

function readPublicNumber(config: Prisma.JsonValue, key: "limit"): number | undefined {
  if (!config || Array.isArray(config) || typeof config !== "object") return undefined;

  const value = config[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalValue<TKey extends string, TValue>(
  key: TKey,
  value: TValue | undefined,
): { [K in TKey]?: TValue } {
  return value === undefined ? {} : ({ [key]: value } as { [K in TKey]: TValue });
}

function mapPublicSection(section: {
  type: StoreSectionType;
  position: number;
  content: Prisma.JsonValue;
}): PublicStoreSection {
  const title = optionalValue("title", readPublicString(section.content, "title"));

  switch (section.type) {
    case StoreSectionType.HERO: {
      const imageUrl = sanitizePublicImageUrl(
        readPublicString(section.content, "imageUrl"),
      );
      return {
        type: section.type,
        position: section.position,
        content: {
          ...title,
          ...optionalValue("subtitle", readPublicString(section.content, "subtitle")),
          ...optionalValue("ctaLabel", readPublicString(section.content, "ctaLabel")),
          ...optionalValue("ctaHref", readPublicString(section.content, "ctaHref")),
          ...optionalValue("imageUrl", imageUrl),
          ...optionalValue("imageAlt", readPublicString(section.content, "imageAlt")),
        },
      };
    }
    case StoreSectionType.CATEGORIES:
      return { type: section.type, position: section.position, content: title };
    case StoreSectionType.PRODUCT_FEED:
      return {
        type: section.type,
        position: section.position,
        content: {
          ...title,
          ...optionalValue("limit", readPublicNumber(section.content, "limit")),
        },
      };
    case StoreSectionType.PROMOTIONS:
      return {
        type: section.type,
        position: section.position,
        content: {
          ...title,
          ...optionalValue("subtitle", readPublicString(section.content, "subtitle")),
          ...optionalValue("ctaLabel", readPublicString(section.content, "ctaLabel")),
          ...optionalValue("ctaHref", readPublicString(section.content, "ctaHref")),
        },
      };
    case StoreSectionType.TESTIMONIALS:
      return { type: section.type, position: section.position, content: title };
  }
}

export async function loadPublicStore(host: string): Promise<PublicStoreData | null> {
  const tenant = await resolveTenantFromHost(host);
  if (!tenant) return null;

  const tenantId = tenant.id;
  const publishedAt = new Date();
  const [theme, sections, categories, products] = await Promise.all([
    prisma.storeTheme.findFirst({
      where: { tenantId, publishedAt: { not: null, lte: publishedAt } },
      select: { template: true, publishedConfig: true },
    }),
    prisma.storeSection.findMany({
      where: { tenantId, active: true },
      orderBy: { position: "asc" },
      select: { type: true, position: true, content: true },
    }),
    prisma.category.findMany({
      where: { tenantId, active: true },
      orderBy: { position: "asc" },
      select: { name: true, slug: true, position: true },
    }),
    prisma.product.findMany({
      where: {
        tenantId,
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
        publishedAt: { lte: publishedAt },
        category: { is: { active: true } },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        name: true,
        slug: true,
        description: true,
        price: true,
        compareAtPrice: true,
        category: { select: { slug: true } },
        variants: {
          where: { tenantId, active: true },
          orderBy: { createdAt: "asc" },
          select: { sku: true, size: true, color: true, stock: true, price: true },
        },
        media: {
          where: { tenantId, mediaAsset: { is: { deletedAt: null } } },
          orderBy: { position: "asc" },
          select: {
            mediaAsset: { select: { url: true, altText: true } },
          },
        },
      },
    }),
  ]);

  const storeName = theme ? readPublicString(theme.publishedConfig, "storeName") : undefined;
  const whatsAppNumber = theme
    ? readPublicString(theme.publishedConfig, "whatsAppNumber")
    : undefined;
  const accentColor = theme
    ? readPublicString(theme.publishedConfig, "accentColor")
    : undefined;
  const announcement = theme
    ? readPublicString(theme.publishedConfig, "announcement")
    : undefined;

  return {
    tenant: { name: tenant.name, slug: tenant.slug },
    theme: theme
      ? {
          template: theme.template,
          config: accentColor ? { accentColor } : {},
        }
      : null,
    sections: sections.map(mapPublicSection),
    categories,
    products: products.map((product) => ({
      name: product.name,
      slug: product.slug,
      description: product.description,
      categorySlug: product.category.slug,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      variants: product.variants.map((variant) => ({
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        price: variant.price?.toString() ?? null,
      })),
      images: product.media.map(({ mediaAsset }) => ({
        url: mediaAsset.url,
        altText: mediaAsset.altText,
      })),
    })),
    settings: {
      name: storeName ?? tenant.name,
      whatsAppNumber: whatsAppNumber ?? null,
      texts: announcement ? { announcement } : {},
    },
  };
}
