import {
  GlobalRole,
  MembershipRole,
  MembershipStatus,
  TemplateKey,
  TenantStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: { findFirst: vi.fn() },
  tenant: { findFirst: vi.fn() },
  membership: { findFirst: vi.fn() },
  storeTheme: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  storeSection: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
}));

const authMock = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../src/lib/auth/config", () => ({ auth: authMock }));

import { PATCH as patchAppearance } from "../src/app/api/tenants/[tenantId]/appearance/route";
import { POST as publishAppearance } from "../src/app/api/tenants/[tenantId]/appearance/publish/route";

const now = new Date("2026-07-30T12:00:00.000Z");

const tenantA = {
  id: "tenant-a",
  slug: "tenant-a",
  name: "Tenant A",
  status: TenantStatus.ACTIVE,
  publicDomain: "tenant-a.example.com",
  subdomain: "tenant-a",
  planId: "plan-basic",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const tenantB = {
  id: "tenant-b",
  slug: "tenant-b",
  name: "Tenant B",
  status: TenantStatus.ACTIVE,
  publicDomain: "tenant-b.example.com",
  subdomain: "tenant-b",
  planId: "plan-basic",
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

const user = {
  id: "user-owner-a",
  name: "Owner Tenant A",
  email: "owner-a@novaq.test",
  hashedPassword: "hashed",
  role: GlobalRole.USER,
  ativo: true,
  createdAt: now,
  updatedAt: now,
};

const membershipTenantA = {
  id: "membership-a",
  tenantId: tenantA.id,
  userId: user.id,
  role: MembershipRole.OWNER,
  status: MembershipStatus.ACTIVE,
  createdAt: now,
  updatedAt: now,
};

function session() {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      ativo: true,
    },
    expires: new Date(now.getTime() + 60_000).toISOString(),
  };
}

function buildDraft() {
  return {
    template: TemplateKey.MODABELLA,
    theme: {
      storeName: "Tenant A Boutique",
      accentColor: "#B45372",
      announcement: "Frete grátis.",
      whatsAppNumber: "5585987654321",
    },
    sections: {
      hero: {
        title: "Seu estilo, sua história",
        subtitle: "Peças para todos os momentos.",
        ctaLabel: "Ver novidades",
        ctaHref: "#novidades",
        imageUrl: "https://cdn.example.com/hero.jpg",
      },
      categories: {
        title: "Compre por categoria",
        enabled: true,
      },
      productFeed: {
        title: "Mais vendidos",
        limit: 12,
        enabled: true,
      },
    },
  };
}

describe("appearance routes with real tenant authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue(session());
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.user.findFirst.mockResolvedValue(user);
    prismaMock.tenant.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === tenantA.id) return tenantA;
      if (where.id === tenantB.id) return tenantB;
      return null;
    });
    prismaMock.membership.findFirst.mockImplementation(async ({ where }) => {
      if (where.tenantId === tenantA.id && where.userId === user.id) {
        return membershipTenantA;
      }

      return null;
    });
  });

  it("returns 403 on PATCH when the session belongs only to another tenant", async () => {
    const response = await patchAppearance(
      new Request(`http://localhost/api/tenants/${tenantB.id}/appearance`, {
        method: "PATCH",
        body: JSON.stringify(buildDraft()),
      }),
      { params: Promise.resolve({ tenantId: tenantB.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("TENANT_FORBIDDEN");
    expect(prismaMock.storeTheme.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.storeTheme.upsert).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.createMany).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns 403 on POST publish when the session belongs only to another tenant", async () => {
    const response = await publishAppearance(
      new Request(`http://localhost/api/tenants/${tenantB.id}/appearance/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ tenantId: tenantB.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("TENANT_FORBIDDEN");
    expect(prismaMock.storeTheme.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.storeTheme.upsert).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.storeSection.createMany).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });
});
