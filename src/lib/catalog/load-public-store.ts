import { ProductStatus, type Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { resolveTenantFromHost } from "../tenant/resolve";
import type { PublicStoreData } from "./types";

function readPublicString(
  config: Prisma.JsonValue,
  key: "storeName" | "whatsAppNumber" | "accentColor" | "announcement",
): string | undefined {
  if (!config || Array.isArray(config) || typeof config !== "object") return undefined;

  const value = config[key];
  return typeof value === "string" ? value : undefined;
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
          select: { size: true, color: true, stock: true, price: true },
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
    sections,
    categories,
    products: products.map((product) => ({
      name: product.name,
      slug: product.slug,
      description: product.description,
      categorySlug: product.category.slug,
      price: product.price.toString(),
      compareAtPrice: product.compareAtPrice?.toString() ?? null,
      variants: product.variants.map((variant) => ({
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
