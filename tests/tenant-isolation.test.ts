import {
  GlobalRole,
  MembershipRole,
  MembershipStatus,
  TenantStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  tenant: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  membership: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: database }));

import { requireTenantContext } from "../src/lib/tenant/require-context";
import { resolveTenantFromHost } from "../src/lib/tenant/resolve";
import { tenantFilter } from "../src/lib/tenant/scoped-repository";

const tenantA = {
  id: "tenant-a",
  slug: "loja-a",
  name: "Loja A",
  status: TenantStatus.ACTIVE,
  publicDomain: "loja-a.example.com",
  subdomain: "loja-a",
  planId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const tenantB = { ...tenantA, id: "tenant-b", slug: "loja-b", name: "Loja B" };
const owner = {
  id: "owner-a",
  name: "Owner A",
  email: "owner@example.com",
  hashedPassword: "hash",
  role: GlobalRole.USER,
  ativo: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.$transaction.mockImplementation(async (operation) => operation(database));
  });

  it("does not let an owner from tenant A create context for tenant B", async () => {
    database.user.findFirst.mockResolvedValue(owner);
    database.tenant.findFirst.mockResolvedValue(tenantB);
    database.membership.findFirst.mockResolvedValue(null);

    await expect(
      requireTenantContext({ tenantId: tenantB.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: "TENANT_FORBIDDEN" });
  });

  it("lets a superadmin access tenants without memberships", async () => {
    database.user.findFirst.mockResolvedValue({ ...owner, role: GlobalRole.SUPERADMIN });
    database.tenant.findFirst.mockResolvedValueOnce(tenantA).mockResolvedValueOnce(tenantB);
    database.membership.findFirst.mockResolvedValue(null);

    const contextA = await requireTenantContext({ tenantId: tenantA.id, userId: owner.id });
    const contextB = await requireTenantContext({ tenantId: tenantB.id, userId: owner.id });

    expect(contextA.isSuperadmin).toBe(true);
    expect(contextB.isSuperadmin).toBe(true);
    expect(tenantFilter(contextA)).toEqual({ tenantId: "tenant-a" });
    expect(tenantFilter(contextB)).toEqual({ tenantId: "tenant-b" });
  });

  it("lets a superadmin recover a suspended tenant while regular users remain blocked", async () => {
    const suspendedTenant = { ...tenantA, status: TenantStatus.SUSPENDED };
    database.user.findFirst
      .mockResolvedValueOnce({ ...owner, role: GlobalRole.SUPERADMIN })
      .mockResolvedValueOnce(owner);
    database.tenant.findFirst
      .mockResolvedValueOnce(suspendedTenant)
      .mockResolvedValueOnce(null);
    database.membership.findFirst.mockResolvedValue(null);

    await expect(
      requireTenantContext({ tenantId: tenantA.id, userId: owner.id }),
    ).resolves.toMatchObject({ tenant: suspendedTenant, isSuperadmin: true });
    await expect(
      requireTenantContext({ tenantId: tenantA.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
  });

  it("rejects a suspended membership", async () => {
    database.user.findFirst.mockResolvedValue(owner);
    database.tenant.findFirst.mockResolvedValue(tenantA);
    database.membership.findFirst.mockResolvedValue({
      id: "membership-a",
      tenantId: tenantA.id,
      userId: owner.id,
      role: MembershipRole.OWNER,
      status: MembershipStatus.SUSPENDED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      requireTenantContext({ tenantId: tenantA.id, userId: owner.id }),
    ).rejects.toMatchObject({ code: "TENANT_FORBIDDEN" });
  });

  it("does not resolve a soft-deleted tenant from its host", async () => {
    database.tenant.findFirst.mockResolvedValue(null);

    await expect(resolveTenantFromHost("LOJA-A.localhost:3002")).resolves.toBeNull();
    expect(database.tenant.findFirst).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: TenantStatus.ACTIVE,
        OR: [{ subdomain: "loja-a" }, { publicDomain: "loja-a.localhost" }],
      },
    });
  });
});
