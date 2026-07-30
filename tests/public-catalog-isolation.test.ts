import {
  MembershipRole,
  MembershipStatus,
  ProductStatus,
  TemplateKey,
  TenantStatus,
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  $transaction: vi.fn(),
  storeTheme: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  storeSection: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  category: { findMany: vi.fn() },
  product: { findMany: vi.fn() },
  auditLog: { create: vi.fn() },
}));

const resolveTenantFromHost = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => vi.fn());
const requireTenantContext = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/prisma", () => ({ prisma: database }));
vi.mock("../src/lib/tenant/resolve", () => ({ resolveTenantFromHost }));
vi.mock("../src/lib/auth/config", () => ({ auth }));
vi.mock("../src/lib/tenant/require-context", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/tenant/require-context")>(
    "../src/lib/tenant/require-context",
  );

  return {
    ...actual,
    requireTenantContext,
  };
});

import { loadPublicStore } from "../src/lib/catalog/load-public-store";
import { GET as getAppearance, PATCH as patchAppearance } from "../src/app/api/tenants/[tenantId]/appearance/route";
import { POST as publishAppearance } from "../src/app/api/tenants/[tenantId]/appearance/publish/route";
import { TenantAccessError } from "../src/lib/tenant/types";

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

const otherTenant = {
  id: "tenant-other",
  slug: "other-store",
  name: "Other Store",
  status: TenantStatus.ACTIVE,
  publicDomain: "other.example.com",
  subdomain: "other-store",
  planId: "plan-basic",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const ownerMembership = {
  id: "membership-owner",
  tenantId: modaBella.id,
  userId: "user-owner",
  role: MembershipRole.OWNER,
  status: MembershipStatus.ACTIVE,
  createdAt: now,
  updatedAt: now,
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

function session(userId = ownerMembership.userId) {
  return {
    user: {
      id: userId,
      name: "Novaq User",
      email: "user@novaq.test",
      ativo: true,
    },
    expires: new Date(now.getTime() + 60_000).toISOString(),
  };
}

function buildDraft(overrides?: {
  theme?: Partial<{
    storeName: string;
    accentColor: string;
    announcement: string;
    whatsAppNumber: string;
  }>;
  sections?: {
    hero?: Partial<{
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaHref: string;
      imageUrl: string;
    }>;
    categories?: Partial<{ title: string; enabled: boolean }>;
    productFeed?: Partial<{ title: string; limit: number; enabled: boolean }>;
  };
}) {
  return {
    template: TemplateKey.MODABELLA,
    theme: {
      storeName: "ModaBella",
      accentColor: "#B45372",
      announcement: "Frete grátis em Fortaleza.",
      whatsAppNumber: "5585987654321",
      ...(overrides?.theme ?? {}),
    },
    sections: {
      hero: {
        title: "Seu estilo, sua história",
        subtitle: "Peças para todos os momentos.",
        ctaLabel: "Ver novidades",
        ctaHref: "#novidades",
        imageUrl: "https://cdn.example.com/hero.jpg",
        ...(overrides?.sections?.hero ?? {}),
      },
      categories: {
        title: "Compre por categoria",
        enabled: true,
        ...(overrides?.sections?.categories ?? {}),
      },
      productFeed: {
        title: "Mais vendidos",
        limit: 12,
        enabled: true,
        ...(overrides?.sections?.productFeed ?? {}),
      },
    },
  };
}

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

    const themeState = new Map<string, {
      tenantId: string;
      template: TemplateKey;
      draftConfig: ReturnType<typeof buildDraft>;
      publishedConfig: Record<string, unknown>;
      publishedAt: Date | null;
    }>([
      [
        modaBella.id,
        {
          tenantId: modaBella.id,
          template: TemplateKey.MODABELLA,
          draftConfig: buildDraft(),
          publishedConfig: {
            storeName: "ModaBella",
            whatsAppNumber: "5585987654321",
            accentColor: "#B45372",
            announcement: "Frete grátis em Fortaleza.",
            draftOnlyNote: "never public",
          },
          publishedAt: new Date("2026-07-20T10:00:00.000Z"),
        },
      ],
      [
        otherTenant.id,
        {
          tenantId: otherTenant.id,
          template: TemplateKey.MODABELLA,
          draftConfig: buildDraft({
            theme: {
              storeName: "Other Store",
              accentColor: "#4F46E5",
              announcement: "Entrega em 24h.",
              whatsAppNumber: "5585999988776",
            },
            sections: {
              hero: { title: "Coleção Other" },
              categories: { title: "Explorar" },
              productFeed: { title: "Em destaque", limit: 6 },
            },
          }),
          publishedConfig: {
            storeName: "Other Store",
            whatsAppNumber: "5585999988776",
            accentColor: "#4F46E5",
            announcement: "Entrega em 24h.",
          },
          publishedAt: new Date("2026-07-21T10:00:00.000Z"),
        },
      ],
    ]);

    const sectionState = new Map<string, Array<{
      tenantId: string;
      type: string;
      position: number;
      active: boolean;
      content: Record<string, unknown>;
    }>>([
      [
        modaBella.id,
        [
          {
            tenantId: modaBella.id,
            type: "HERO",
            position: 0,
            active: true,
            content: {
              title: "Seu estilo, sua história",
              imageUrl: "https://cdn.example.com/hero.jpg",
              imageAlt: "Editorial ModaBella",
            },
          },
        ],
      ],
      [
        otherTenant.id,
        [
          {
            tenantId: otherTenant.id,
            type: "HERO",
            position: 0,
            active: true,
            content: {
              title: "Coleção Other",
              imageUrl: "https://cdn.example.com/other-hero.jpg",
              imageAlt: "Editorial Other",
            },
          },
          {
            tenantId: otherTenant.id,
            type: "CATEGORIES",
            position: 1,
            active: true,
            content: { title: "Explorar" },
          },
          {
            tenantId: otherTenant.id,
            type: "PRODUCT_FEED",
            position: 2,
            active: true,
            content: { title: "Em destaque", limit: 6 },
          },
        ],
      ],
    ]);

    resolveTenantFromHost.mockImplementation(async (host: string) => {
      if (host === modaBella.publicDomain) return modaBella;
      if (host === otherTenant.publicDomain) return otherTenant;
      return null;
    });

    auth.mockResolvedValue(session());
    requireTenantContext.mockImplementation(async ({ tenantId }: { tenantId: string }) => ({
      tenantId,
      tenant: tenantId === modaBella.id ? modaBella : otherTenant,
      userId: ownerMembership.userId,
      membership: { ...ownerMembership, tenantId },
      isSuperadmin: false,
    }));

    database.$transaction.mockImplementation(async (operation) => operation(database));
    database.storeTheme.findFirst.mockImplementation(async ({ where }) => {
      const theme = themeState.get(where.tenantId);
      if (!theme || !theme.publishedAt || theme.publishedAt > where.publishedAt.lte) return null;
      return {
        template: theme.template,
        publishedConfig: theme.publishedConfig,
      };
    });
    database.storeTheme.findUnique.mockImplementation(async ({ where }) => {
      const theme = themeState.get(where.tenantId);
      return theme
        ? {
            tenantId: theme.tenantId,
            template: theme.template,
            draftConfig: theme.draftConfig,
            publishedConfig: theme.publishedConfig,
            publishedAt: theme.publishedAt,
          }
        : null;
    });
    database.storeTheme.upsert.mockImplementation(async ({ where, create, update }) => {
      const currentTheme = themeState.get(where.tenantId);
      const nextTheme = {
        tenantId: where.tenantId,
        template: (update?.template ?? create.template) as TemplateKey,
        draftConfig: (
          update && "draftConfig" in update
            ? update.draftConfig
            : currentTheme?.draftConfig ?? create.draftConfig
        ) as ReturnType<typeof buildDraft>,
        publishedConfig: (
          update && "publishedConfig" in update
            ? update.publishedConfig
            : currentTheme?.publishedConfig ?? create.publishedConfig
        ) as Record<string, unknown>,
        publishedAt: (
          update && "publishedAt" in update
            ? update.publishedAt
            : currentTheme?.publishedAt ?? create.publishedAt ?? null
        ) as Date | null,
      };

      themeState.set(where.tenantId, {
        ...nextTheme,
        draftConfig: nextTheme.draftConfig ?? currentTheme?.draftConfig ?? buildDraft(),
        publishedConfig: nextTheme.publishedConfig ?? currentTheme?.publishedConfig ?? {},
      });

      return themeState.get(where.tenantId);
    });
    database.storeSection.findMany.mockImplementation(async ({ where }) => {
      const sections = [...(sectionState.get(where.tenantId) ?? [])];
      const filteredByType = where.type?.in
        ? sections.filter((section) => where.type.in.includes(section.type))
        : sections;
      const filteredByActive = typeof where.active === "boolean"
        ? filteredByType.filter((section) => section.active === where.active)
        : filteredByType;
      return filteredByActive
        .sort((left, right) => left.position - right.position)
        .map((section) => ({
          type: section.type,
          position: section.position,
          active: section.active,
          content: section.content,
        }));
    });
    database.storeSection.deleteMany.mockImplementation(async ({ where }) => {
      sectionState.set(
        where.tenantId,
        (sectionState.get(where.tenantId) ?? []).filter(
          (section) => !where.type.in.includes(section.type),
        ),
      );
      return { count: 0 };
    });
    database.storeSection.createMany.mockImplementation(async ({ data }) => {
      const rows = Array.isArray(data) ? data : [data];
      const tenantId = rows[0]?.tenantId;
      if (!tenantId) return { count: 0 };

      sectionState.set(tenantId, [
        ...(sectionState.get(tenantId) ?? []),
        ...rows.map((row) => ({
          tenantId: row.tenantId,
          type: row.type,
          position: row.position,
          active: row.active,
          content: row.content as Record<string, unknown>,
        })),
      ]);

      return { count: rows.length };
    });
    database.auditLog.create.mockResolvedValue(undefined);
    database.category.findMany.mockImplementation(async ({ where }) => {
      if (where.tenantId === otherTenant.id) {
        return [{ name: "Novidades", slug: "novidades", position: 0 }];
      }

      return [{ name: "Vestidos", slug: "vestidos", position: 0 }];
    });
    database.product.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          visibleProduct,
          { ...visibleProduct, id: "product-draft", slug: "draft", status: ProductStatus.DRAFT },
          { ...visibleProduct, id: "product-other-tenant", slug: "other", tenantId: otherTenant.id },
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
      sections: [{
        type: "HERO",
        position: 0,
        content: {
          title: "Seu estilo, sua história",
          imageUrl: "https://cdn.example.com/hero.jpg",
          imageAlt: "Editorial ModaBella",
        },
      }],
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
            { sku: "MB-AURORA-P", size: "P", color: "Rosa", stock: 8, price: "199.90" },
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

    expect(database.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          variants: expect.objectContaining({
            select: expect.objectContaining({ sku: true }),
          }),
        }),
      }),
    );
  });

  it("whitelists public content fields for every section type", async () => {
    database.storeSection.findMany.mockResolvedValueOnce([
      {
        type: "HERO",
        position: 0,
        content: {
          title: "Hero",
          subtitle: "Subtitle",
          ctaLabel: "Shop",
          ctaHref: "#products",
          imageUrl: "https://cdn.example.com/configured-hero.jpg",
          imageAlt: "Configured hero",
          imageAdminId: "asset-secret",
          tenantId: "tenant-other",
        },
      },
      {
        type: "CATEGORIES",
        position: 1,
        content: { title: "Categories", status: "DRAFT" },
      },
      {
        type: "PRODUCT_FEED",
        position: 2,
        content: { title: "Products", limit: 12, admin: true },
      },
      {
        type: "PROMOTIONS",
        position: 3,
        content: {
          title: "Promotion",
          subtitle: "This week",
          ctaLabel: "View",
          ctaHref: "/promotions",
          draft: { internalNote: "hidden" },
        },
      },
      {
        type: "TESTIMONIALS",
        position: 4,
        content: { title: "Testimonials", admin: { ownerEmail: "owner@example.com" } },
      },
    ]);

    const store = await loadPublicStore("modabella.example.com");

    expect(store?.sections).toEqual([
      {
        type: "HERO",
        position: 0,
        content: {
          title: "Hero",
          subtitle: "Subtitle",
          ctaLabel: "Shop",
          ctaHref: "#products",
          imageUrl: "https://cdn.example.com/configured-hero.jpg",
          imageAlt: "Configured hero",
        },
      },
      { type: "CATEGORIES", position: 1, content: { title: "Categories" } },
      { type: "PRODUCT_FEED", position: 2, content: { title: "Products", limit: 12 } },
      {
        type: "PROMOTIONS",
        position: 3,
        content: {
          title: "Promotion",
          subtitle: "This week",
          ctaLabel: "View",
          ctaHref: "/promotions",
        },
      },
      { type: "TESTIMONIALS", position: 4, content: { title: "Testimonials" } },
    ]);
  });

  it("does not expose an unsafe hero image URL from stored section content", async () => {
    database.storeSection.findMany.mockResolvedValueOnce([
      {
        type: "HERO",
        position: 0,
        content: {
          title: "Hero seguro",
          imageUrl: "javascript:alert(1)",
          imageAlt: "Texto alternativo preservado",
        },
      },
    ]);

    const store = await loadPublicStore("modabella.example.com");

    expect(store?.sections).toEqual([
      {
        type: "HERO",
        position: 0,
        content: {
          title: "Hero seguro",
          imageAlt: "Texto alternativo preservado",
        },
      },
    ]);
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

  it("keeps public DTO on the last publish until draft publication and updates only the selected tenant", async () => {
    const nextDraft = buildDraft({
      theme: {
        storeName: "ModaBella Atelier",
        accentColor: "#0F766E",
        announcement: "Nova campanha publicada.",
        whatsAppNumber: "5585987654000",
      },
      sections: {
        hero: {
          title: "Preview que ainda não foi ao ar",
          subtitle: "A nova vitrine entra só após publicar.",
          ctaLabel: "Conhecer coleção",
          ctaHref: "#colecao",
          imageUrl: "https://cdn.example.com/hero-new.jpg",
        },
        categories: {
          title: "Categorias em destaque",
          enabled: true,
        },
        productFeed: {
          title: "Mais desejados",
          enabled: true,
          limit: 8,
        },
      },
    });

    const beforeSave = await loadPublicStore(modaBella.publicDomain);
    const otherBeforeSave = await loadPublicStore(otherTenant.publicDomain);

    const saveResponse = await patchAppearance(
      new Request(`http://localhost/api/tenants/${modaBella.id}/appearance`, {
        method: "PATCH",
        body: JSON.stringify(nextDraft),
      }),
      { params: Promise.resolve({ tenantId: modaBella.id }) },
    );

    const afterSave = await loadPublicStore(modaBella.publicDomain);
    const otherAfterSave = await loadPublicStore(otherTenant.publicDomain);

    expect(saveResponse.status).toBe(200);
    expect(afterSave?.settings.name).toBe(beforeSave?.settings.name);
    expect(afterSave?.theme?.config.accentColor).toBe(beforeSave?.theme?.config.accentColor);
    expect(afterSave?.sections[0]?.content.title).toBe(beforeSave?.sections[0]?.content.title);
    expect(otherAfterSave).toEqual(otherBeforeSave);

    const publishResponse = await publishAppearance(
      new Request(`http://localhost/api/tenants/${modaBella.id}/appearance/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ tenantId: modaBella.id }) },
    );
    const appearanceResponse = await getAppearance(
      new Request(`http://localhost/api/tenants/${modaBella.id}/appearance`),
      { params: Promise.resolve({ tenantId: modaBella.id }) },
    );
    const appearanceBody = await appearanceResponse.json();
    const afterPublish = await loadPublicStore(modaBella.publicDomain);
    const otherAfterPublish = await loadPublicStore(otherTenant.publicDomain);

    expect(publishResponse.status).toBe(201);
    expect(database.storeTheme.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          publishedConfig: {
            storeName: "ModaBella Atelier",
            accentColor: "#0F766E",
            announcement: "Nova campanha publicada.",
            whatsAppNumber: "5585987654000",
          },
        }),
      }),
    );
    expect(afterPublish?.settings).toEqual({
      name: "ModaBella Atelier",
      whatsAppNumber: "5585987654000",
      texts: { announcement: "Nova campanha publicada." },
    });
    expect(afterPublish?.theme).toEqual({
      template: "MODABELLA",
      config: { accentColor: "#0F766E" },
    });
    expect(afterPublish?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "HERO",
          content: expect.objectContaining({
            title: "Preview que ainda não foi ao ar",
            subtitle: "A nova vitrine entra só após publicar.",
            ctaLabel: "Conhecer coleção",
            ctaHref: "#colecao",
            imageUrl: "https://cdn.example.com/hero-new.jpg",
          }),
        }),
        expect.objectContaining({
          type: "CATEGORIES",
          content: { title: "Categorias em destaque" },
        }),
        expect.objectContaining({
          type: "PRODUCT_FEED",
          content: { title: "Mais desejados", limit: 8 },
        }),
      ]),
    );
    expect(otherAfterPublish).toEqual(otherBeforeSave);
    expect(appearanceResponse.status).toBe(200);
    expect(appearanceBody.published.theme).toEqual({
      storeName: "ModaBella Atelier",
      accentColor: "#0F766E",
      announcement: "Nova campanha publicada.",
      whatsAppNumber: "5585987654000",
    });
    expect(appearanceBody.published.sections.hero).toEqual({
      title: "Preview que ainda não foi ao ar",
      subtitle: "A nova vitrine entra só após publicar.",
      ctaLabel: "Conhecer coleção",
      ctaHref: "#colecao",
      imageUrl: "https://cdn.example.com/hero-new.jpg",
    });
  });

  it("rejects PATCH /appearance when the authenticated session targets another tenant", async () => {
    requireTenantContext.mockRejectedValueOnce(
      new TenantAccessError(
        "TENANT_FORBIDDEN",
        "Usuário não possui vínculo ativo com este tenant.",
      ),
    );

    const response = await patchAppearance(
      new Request(`http://localhost/api/tenants/${otherTenant.id}/appearance`, {
        method: "PATCH",
        body: JSON.stringify(buildDraft()),
      }),
      { params: Promise.resolve({ tenantId: otherTenant.id }) },
    );

    expect(response.status).toBe(403);
    expect(database.storeTheme.upsert).not.toHaveBeenCalled();
    expect(database.storeSection.createMany).not.toHaveBeenCalled();
  });

  it("rejects POST /appearance/publish when the authenticated session targets another tenant", async () => {
    requireTenantContext.mockRejectedValueOnce(
      new TenantAccessError(
        "TENANT_FORBIDDEN",
        "Usuário não possui vínculo ativo com este tenant.",
      ),
    );

    const response = await publishAppearance(
      new Request(`http://localhost/api/tenants/${otherTenant.id}/appearance/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ tenantId: otherTenant.id }) },
    );

    expect(response.status).toBe(403);
    expect(database.storeTheme.upsert).not.toHaveBeenCalled();
    expect(database.storeSection.createMany).not.toHaveBeenCalled();
  });
});
