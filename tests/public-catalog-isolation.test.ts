import { ProductStatus, TenantStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  storeTheme: { findFirst: vi.fn() },
  storeSection: { findMany: vi.fn() },
  category: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
}));

const resolveTenantFromHost = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/prisma", () => ({ prisma: database }));
vi.mock("../src/lib/tenant/resolve", () => ({ resolveTenantFromHost }));

import { loadPublicStore } from "../src/lib/catalog/load-public-store";

const now = new Date("2026-07-30T12:00:00.000Z");
const modaBella = {
  id: "tenant-modabella",
  slug: "modabella",
  name: "ModaBella",
  status: TenantStatus.ACTIVE,
  publicDomain: "modabella.example.com",
  subdomain: "modabella",
  planId: "plan-basic",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const visibleProduct = {
  id: "product-visible",
  tenantId: modaBella.id,
  categoryId: "category-dresses",
  name: "Vestido Aurora",
  slug: "vestido-aurora",
  description: "Vestido midi em tecido leve.",
  price: { toString: () => "189.90" },
  compareAtPrice: { toString: () => "229.90" },
  status: ProductStatus.PUBLISHED,
  publishedAt: new Date("2026-07-01T00:00:00.000Z"),
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  category: { slug: "vestidos", active: true },
  variants: [
    {
      id: "variant-visible",
      tenantId: modaBella.id,
      productId: "product-visible",
      sku: "MB-AURORA-P",
      size: "P",
      color: "Rosa",
      stock: 8,
      price: { toString: () => "199.90" },
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  media: [
    {
      id: "media-link-visible",
      tenantId: modaBella.id,
      productId: "product-visible",
      mediaAssetId: "asset-visible",
      position: 0,
      createdAt: now,
      mediaAsset: {
        id: "asset-visible",
        tenantId: modaBella.id,
        storageKey: "catalog/aurora.jpg",
        url: "https://cdn.example.com/aurora.jpg",
        fileName: "aurora.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 200000,
        altText: "Vestido Aurora rosa",
        createdAt: now,
        deletedAt: null,
      },
    },
  ],
};

function isVisibleToPublicCatalog(
  product: {
    tenantId: string;
    status: ProductStatus;
    deletedAt: null;
    publishedAt: Date | null;
  },
  where: {
    tenantId: string;
    status: ProductStatus;
    deletedAt: null;
    publishedAt: { lte: Date };
  },
): boolean {
  return (
    product.tenantId === where.tenantId &&
    product.status === where.status &&
    product.deletedAt === where.deletedAt &&
    product.publishedAt !== null &&
    product.publishedAt <= where.publishedAt.lte
  );
}

describe("public catalog host isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.clearAllMocks();
    resolveTenantFromHost.mockResolvedValue(modaBella);
    database.storeTheme.findFirst.mockResolvedValue({
      template: "MODABELLA",
      publishedConfig: {
        storeName: "ModaBella",
        whatsAppNumber: "5585987654321",
        accentColor: "#B45372",
        announcement: "Frete grátis em Fortaleza.",
        draftOnlyNote: "never public",
      },
    });
    database.storeSection.findMany.mockResolvedValue([
      {
        type: "HERO",
        position: 0,
        content: { title: "Seu estilo, sua história" },
      },
    ]);
    database.category.findMany.mockResolvedValue([
      { name: "Vestidos", slug: "vestidos", position: 0 },
    ]);
    database.product.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          visibleProduct,
          { ...visibleProduct, id: "product-draft", slug: "draft", status: ProductStatus.DRAFT },
          { ...visibleProduct, id: "product-other-tenant", slug: "other", tenantId: "tenant-other" },
          {
            ...visibleProduct,
            id: "product-future",
            slug: "future",
            publishedAt: new Date("2026-08-01T00:00:00.000Z"),
          },
        ].filter((product) => isVisibleToPublicCatalog(product, where)),
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads ModaBella data from its host without exposing administrative fields", async () => {
    const store = await loadPublicStore("modabella.example.com");

    expect(store).toEqual({
      tenant: { name: "ModaBella", slug: "modabella" },
      theme: { template: "MODABELLA", config: { accentColor: "#B45372" } },
      sections: [{ type: "HERO", position: 0, content: { title: "Seu estilo, sua história" } }],
      categories: [{ name: "Vestidos", slug: "vestidos", position: 0 }],
      products: [
        {
          name: "Vestido Aurora",
          slug: "vestido-aurora",
          description: "Vestido midi em tecido leve.",
          categorySlug: "vestidos",
          price: "189.90",
          compareAtPrice: "229.90",
          variants: [
            { size: "P", color: "Rosa", stock: 8, price: "199.90" },
          ],
          images: [
            { url: "https://cdn.example.com/aurora.jpg", altText: "Vestido Aurora rosa" },
          ],
        },
      ],
      settings: {
        name: "ModaBella",
        whatsAppNumber: "5585987654321",
        texts: { announcement: "Frete grátis em Fortaleza." },
      },
    });
  });

  it("returns null for an unknown host", async () => {
    resolveTenantFromHost.mockResolvedValueOnce(null);

    await expect(loadPublicStore("unknown.example.com")).resolves.toBeNull();
    expect(database.product.findMany).not.toHaveBeenCalled();
  });

  it("returns null when host resolution rejects a paused tenant", async () => {
    resolveTenantFromHost.mockResolvedValueOnce(null);

    await expect(loadPublicStore("paused.example.com")).resolves.toBeNull();
    expect(database.storeTheme.findFirst).not.toHaveBeenCalled();
  });

  it("only returns published, current products for the resolved tenant", async () => {
    const store = await loadPublicStore("modabella.example.com");

    expect(store?.products.map((product) => product.slug)).toEqual(["vestido-aurora"]);
    expect(database.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: modaBella.id,
          status: ProductStatus.PUBLISHED,
          deletedAt: null,
          publishedAt: { lte: now },
        }),
      }),
    );
  });

  it("accepts only a host as the public loader input", () => {
    expectTypeOf(loadPublicStore).parameters.toEqualTypeOf<[host: string]>();
  });
});
