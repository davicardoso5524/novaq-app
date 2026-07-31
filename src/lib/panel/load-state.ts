import { GlobalRole, MembershipStatus, TenantStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { requireTenantContext } from "../tenant/require-context";
import type { TenantSummary } from "../../components/tenant-switcher";

type PanelUser = { id: string; role: GlobalRole };

export async function loadPanelState(user: PanelUser, requestedTenantId?: string) {
  const tenants: TenantSummary[] =
    user.role === GlobalRole.SUPERADMIN
      ? (
          await prisma.tenant.findMany({
            where: { status: TenantStatus.ACTIVE, deletedAt: null },
            select: { id: true, slug: true, name: true },
            orderBy: { name: "asc" },
          })
        ).map((tenant) => ({ ...tenant, role: "SUPERADMIN" as const }))
      : (
          await prisma.membership.findMany({
            where: {
              userId: user.id,
              status: MembershipStatus.ACTIVE,
              tenant: { status: TenantStatus.ACTIVE, deletedAt: null },
            },
            select: { role: true, tenant: { select: { id: true, slug: true, name: true } } },
            orderBy: { tenant: { name: "asc" } },
          })
        ).map(({ tenant, role }) => ({ ...tenant, role }));

  const requested = requestedTenantId
    ? tenants.find((tenant) => tenant.id === requestedTenantId)
    : undefined;
  const activeTenant = requested ?? tenants[0] ?? null;
  const requestedUnavailable = Boolean(requestedTenantId && !requested);

  if (activeTenant) {
    await requireTenantContext({ tenantId: activeTenant.id, userId: user.id });
  }

  return { tenants, activeTenant, requestedUnavailable };
}
