import { GlobalRole, MembershipRole, MembershipStatus, TenantStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  requireTenantContext: vi.fn(),
  requireTenantRole: vi.fn(),
  tenant: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: { findUnique: vi.fn() },
  membership: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
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
    requireTenantRole: mocks.requireTenantRole,
  };
});

import { GET as listTenants, POST as createTenant } from "../src/app/api/tenants/route";
import { GET as getTenant } from "../src/app/api/tenants/[tenantId]/route";
import { POST as createMember } from "../src/app/api/tenants/[tenantId]/members/route";
import { TenantAccessError } from "../src/lib/tenant/types";

const tenant = {
  id: "tenant-a",
  slug: "loja-a",
  name: "Loja A",
  status: TenantStatus.ACTIVE,
  publicDomain: null,
  subdomain: "loja-a",
  planId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function session(role: GlobalRole = GlobalRole.USER) {
  return {
    user: {
      id: "user-a",
      name: "User A",
      email: "user@example.com",
      role,
      ativo: true,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("tenant API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.$transaction.mockImplementation(async (operation) => operation(mocks));
  });

  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await createTenant(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Loja A", slug: "loja-a", ownerEmail: "owner@example.com" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when a regular user tries to create a tenant", async () => {
    mocks.auth.mockResolvedValue(session());

    const response = await createTenant(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Loja A", slug: "loja-a", ownerEmail: "owner@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("lists only memberships for a regular user", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.membership.findMany.mockResolvedValue([
      { role: MembershipRole.OWNER, tenant },
    ]);

    const response = await listTenants();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tenants).toHaveLength(1);
    expect(body.tenants[0]).toMatchObject({ id: "tenant-a", role: "OWNER" });
    expect(mocks.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-a", status: MembershipStatus.ACTIVE }),
      }),
    );
  });

  it("returns 409 when slug or subdomain already exists", async () => {
    mocks.auth.mockResolvedValue(session(GlobalRole.SUPERADMIN));
    mocks.user.findUnique.mockResolvedValue({ id: "owner-a", ativo: true });
    mocks.tenant.findFirst.mockResolvedValue(tenant);

    const response = await createTenant(
      new Request("http://localhost/api/tenants", {
        method: "POST",
        body: JSON.stringify({ name: "Loja A", slug: "loja-a", ownerEmail: "owner@example.com" }),
      }),
    );

    expect(response.status).toBe(409);
  });

  it("maps an unavailable authorized tenant to 404", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockRejectedValue(
      new TenantAccessError("TENANT_NOT_FOUND", "Tenant indisponível."),
    );

    const response = await getTenant(new Request("http://localhost/api/tenants/missing"), {
      params: Promise.resolve({ tenantId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("prevents duplicate memberships", async () => {
    mocks.auth.mockResolvedValue(session());
    mocks.requireTenantContext.mockResolvedValue({
      tenantId: tenant.id,
      tenant,
      userId: "user-a",
      membership: {
        id: "membership-owner",
        tenantId: tenant.id,
        userId: "user-a",
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isSuperadmin: false,
    });
    mocks.user.findUnique.mockResolvedValue({ id: "user-b", ativo: true });
    mocks.membership.findFirst.mockResolvedValue({ id: "existing" });

    const response = await createMember(
      new Request("http://localhost/api/tenants/tenant-a/members", {
        method: "POST",
        body: JSON.stringify({ email: "member@example.com", role: MembershipRole.EDITOR }),
      }),
      { params: Promise.resolve({ tenantId: tenant.id }) },
    );

    expect(response.status).toBe(409);
  });
});
