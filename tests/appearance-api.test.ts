import {
  MembershipRole,
  MembershipStatus,
  TemplateKey,
  TenantStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantContext: vi.fn(),
  storeTheme: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  storeSection: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks }));
vi.mock("../src/lib/tenant/require-context", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/tenant/require-context")>(
    "../src/lib/tenant/require-context",
  );

  return {
    ...actual,
    requireTenantContext: mocks.requireTenantContext,
  };
});

import {
  GET as getAppearance,
  PATCH as patchAppearance,
} from "../src/app/api/tenants/[tenantId]/appearance/route";
import { POST as publishAppearance } from "../src/app/api/tenants/[tenantId]/appearance/publish/route";
import { TenantAccessError } from "../src/lib/tenant/types";

const tenant = {
  id: "tenant-modabella",
  slug: "modabella",
  name: "ModaBella",
  status: TenantStatus.ACTIVE,
  publicDomain: "modabella.example.com",
  subdomain: "modabella",
  planId: null,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  deletedAt: null,
};

const ownerMembership = {
  id: "membership-owner",
  tenantId: tenant.id,
  userId: "user-owner",
  role: MembershipRole.OWNER,
  status: MembershipStatus.ACTIVE,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

const adminMembership = {
  ...ownerMembership,
  id: "membership-admin",
  role: MembershipRole.ADMIN,
};

const editorMembership = {
  ...ownerMembership,
  id: "membership-editor",
  role: MembershipRole.EDITOR,
};

const viewerMembership = {
  ...ownerMembership,
  id: "membership-viewer",
  role: MembershipRole.VIEWER,
};

function session(userId = "user-owner") {
  return {
    user: {
      id: userId,
      name: "Novaq User",
      email: "user@novaq.test",
      ativo: true,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

function buildRouteContext(tenantId = tenant.id) {
  return { params: Promise.resolve({ tenantId }) };
}

type DraftOverrides = {
  template: TemplateKey;
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

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function buildDraft(overrides?: DeepPartial<DraftOverrides>) {
  return {
    template: overrides?.template ?? TemplateKey.MODABELLA,
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

describe("tenant appearance API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.$transaction.mockImplementation(async (operation) => operation(mocks));
    mocks.storeTheme.findUnique.mockResolvedValue({
      tenantId: tenant.id,
      template: TemplateKey.MODABELLA,
      draftConfig: buildDraft(),
      publishedConfig: buildDraft(),
      publishedAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    mocks.storeSection.findMany.mockResolvedValue([
      {
        type: "HERO",
        position: 0,
        active: true,
        content: {
          title: "Seu estilo, sua história",
          subtitle: "Peças para todos os momentos.",
          ctaLabel: "Ver novidades",
          ctaHref: "#novidades",
          imageUrl: "https://cdn.example.com/hero.jpg",
        },
      },
      {
        type: "CATEGORIES",
        position: 1,
        active: true,
        content: { title: "Compre por categoria" },
      },
      {
        type: "PRODUCT_FEED",
        position: 2,
        active: true,
        content: { title: "Mais vendidos", limit: 12 },
      },
    ]);
    mocks.storeTheme.upsert.mockImplementation(async ({ create, update }) => ({
      tenantId: tenant.id,
      template: (update?.template ?? create.template) as TemplateKey,
      draftConfig: (update?.draftConfig ?? create.draftConfig) as ReturnType<typeof buildDraft>,
      publishedConfig: create.publishedConfig,
      publishedAt: null,
    }));
    mocks.storeTheme.update.mockImplementation(async ({ data }) => ({
      tenantId: tenant.id,
      template: data.template,
      draftConfig: buildDraft(),
      publishedConfig: data.publishedConfig,
      publishedAt: data.publishedAt,
    }));
  });

  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await getAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance"),
      buildRouteContext(),
    );

    expect(response.status).toBe(401);
  });

  it("returns draft, published state and template capabilities for owners", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-owner",
      membership: ownerMembership,
      isSuperadmin: false,
    });

    const response = await getAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance"),
      buildRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.capabilities).toEqual({
      canEdit: true,
      canPublish: true,
      templates: [
        { key: "MODABELLA", available: true },
        { key: "TEMPLATE_02", available: false },
        { key: "TEMPLATE_03", available: false },
        { key: "TEMPLATE_04", available: false },
      ],
    });
    expect(body.draft).toEqual(buildDraft());
    expect(body.published).toEqual(buildDraft());
    expect(body.publishedAt).toBe("2026-07-20T10:00:00.000Z");
  });

  it("keeps viewers read-only while still allowing GET access", async () => {
    mocks.auth.mockResolvedValue(session("user-viewer"));
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-viewer",
      membership: viewerMembership,
      isSuperadmin: false,
    });

    const response = await getAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance"),
      buildRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.capabilities.canEdit).toBe(false);
    expect(body.capabilities.canPublish).toBe(false);
  });

  it("rejects writes from read-only memberships", async () => {
    mocks.auth.mockResolvedValue(session("user-viewer"));
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-viewer",
      membership: viewerMembership,
      isSuperadmin: false,
    });

    const response = await patchAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance", {
        method: "PATCH",
        body: JSON.stringify(buildDraft()),
      }),
      buildRouteContext(),
    );

    expect(response.status).toBe(403);
    expect(mocks.storeTheme.upsert).not.toHaveBeenCalled();
  });

  it("rejects writes from editors even when they can access the tenant", async () => {
    mocks.auth.mockResolvedValue(session("user-editor"));
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-editor",
      membership: editorMembership,
      isSuperadmin: false,
    });

    const patchResponse = await patchAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance", {
        method: "PATCH",
        body: JSON.stringify(buildDraft()),
      }),
      buildRouteContext(),
    );

    const publishResponse = await publishAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance/publish", {
        method: "POST",
      }),
      buildRouteContext(),
    );

    expect(patchResponse.status).toBe(403);
    expect(publishResponse.status).toBe(403);
    expect(mocks.storeTheme.upsert).not.toHaveBeenCalled();
    expect(mocks.storeTheme.update).not.toHaveBeenCalled();
  });

  it("does not trust a tenant outside the authenticated membership context", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockRejectedValue(
      new TenantAccessError(
        "TENANT_FORBIDDEN",
        "Usuário não possui vínculo ativo com este tenant.",
      ),
    );

    const response = await getAppearance(
      new Request("http://localhost/api/tenants/tenant-other/appearance"),
      buildRouteContext("tenant-other"),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid accent colors, URLs, limits and unavailable templates", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-owner",
      membership: adminMembership,
      isSuperadmin: false,
    });

    const response = await patchAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance", {
        method: "PATCH",
        body: JSON.stringify(
          buildDraft({
            template: TemplateKey.TEMPLATE_02,
            theme: { accentColor: "pink" },
            sections: {
              hero: { ctaHref: "javascript:alert(1)", imageUrl: "notaurl" },
              productFeed: { limit: 0 },
            },
          }),
        ),
      }),
      buildRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.storeTheme.upsert).not.toHaveBeenCalled();
  });

  it("persists only the whitelisted draft contract for admins", async () => {
    mocks.auth.mockResolvedValue(session("user-admin"));
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-admin",
      membership: adminMembership,
      isSuperadmin: false,
    });

    const dirtyDraft = {
      ...buildDraft(),
      theme: {
        ...buildDraft().theme,
        internalFlag: "should-not-save",
      },
      sections: {
        ...buildDraft().sections,
        hero: {
          ...buildDraft().sections.hero,
          imageAlt: "not allowed in task 1",
        },
      },
      arbitrary: { leaked: true },
    };

    const response = await patchAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance", {
        method: "PATCH",
        body: JSON.stringify(dirtyDraft),
      }),
      buildRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.storeTheme.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: tenant.id },
        update: expect.objectContaining({
          template: TemplateKey.MODABELLA,
          draftConfig: buildDraft(),
        }),
      }),
    );
    expect(body.draft).toEqual(buildDraft());
    expect(body.draft.theme.internalFlag).toBeUndefined();
    expect(body.draft.sections.hero.imageAlt).toBeUndefined();
    expect(body.draft.arbitrary).toBeUndefined();
  });

  it("publishes the validated draft into theme and active store sections in one transaction", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-owner",
      membership: ownerMembership,
      isSuperadmin: false,
    });
    mocks.storeTheme.findUnique.mockResolvedValueOnce({
      tenantId: tenant.id,
      template: TemplateKey.MODABELLA,
      draftConfig: buildDraft({
        sections: {
          categories: { title: "Categorias", enabled: false },
          productFeed: { title: "Mais amados", enabled: true, limit: 8 },
        },
      }),
      publishedConfig: buildDraft(),
      publishedAt: new Date("2026-07-20T10:00:00.000Z"),
    });

    const response = await publishAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance/publish", {
        method: "POST",
      }),
      buildRouteContext(),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.storeTheme.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: tenant.id },
        update: expect.objectContaining({
          template: TemplateKey.MODABELLA,
          publishedConfig: expect.objectContaining({
            storeName: "ModaBella",
            accentColor: "#B45372",
            announcement: "Frete grátis em Fortaleza.",
            whatsAppNumber: "5585987654321",
          }),
          publishedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          tenantId: tenant.id,
          template: TemplateKey.MODABELLA,
          publishedConfig: expect.objectContaining({
            storeName: "ModaBella",
            accentColor: "#B45372",
            announcement: "Frete grátis em Fortaleza.",
            whatsAppNumber: "5585987654321",
          }),
        }),
      }),
    );
    expect(mocks.storeSection.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: tenant.id,
          type: { in: ["HERO", "CATEGORIES", "PRODUCT_FEED"] },
        }),
      }),
    );
    expect(mocks.storeSection.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ tenantId: tenant.id, type: "HERO", active: true }),
          expect.objectContaining({ tenantId: tenant.id, type: "CATEGORIES", active: false }),
          expect.objectContaining({ tenantId: tenant.id, type: "PRODUCT_FEED", active: true }),
        ]),
      }),
    );
    expect(body.published.sections.categories.enabled).toBe(false);
    expect(body.published.sections.productFeed.limit).toBe(8);
  });

  it("creates a store theme on the first publish when the tenant still has no theme row", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-owner",
      membership: ownerMembership,
      isSuperadmin: false,
    });
    mocks.storeTheme.findUnique.mockResolvedValueOnce(null);
    mocks.storeSection.findMany.mockResolvedValueOnce([]);

    const response = await publishAppearance(
      new Request("http://localhost/api/tenants/tenant-modabella/appearance/publish", {
        method: "POST",
      }),
      buildRouteContext(),
    );

    expect(response.status).toBe(201);
    expect(mocks.storeTheme.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: tenant.id },
        create: expect.objectContaining({
          tenantId: tenant.id,
          template: TemplateKey.MODABELLA,
          publishedConfig: expect.objectContaining({
            storeName: tenant.name,
            accentColor: "#B45372",
            announcement: "",
            whatsAppNumber: "5585987654321",
          }),
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(mocks.storeSection.createMany).toHaveBeenCalled();
  });
});
