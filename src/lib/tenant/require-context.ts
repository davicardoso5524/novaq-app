import {
  GlobalRole,
  MembershipStatus,
  Prisma,
  TenantStatus,
} from "@prisma/client";
import { prisma } from "../prisma";
import {
  TenantAccessError,
  type TenantContext,
  type TenantRole,
} from "./types";

export async function requireTenantContext(input: {
  tenantId: string;
  userId: string;
}): Promise<TenantContext> {
  return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
    const [user, tenant] = await Promise.all([
      transaction.user.findFirst({ where: { id: input.userId, ativo: true } }),
      transaction.tenant.findFirst({
        where: {
          id: input.tenantId,
          status: TenantStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    ]);

    if (!user) {
      throw new TenantAccessError(
        "USER_UNAUTHORIZED",
        "Usuário inexistente ou inativo.",
      );
    }
    if (!tenant) {
      throw new TenantAccessError(
        "TENANT_NOT_FOUND",
        "Tenant inexistente ou indisponível.",
      );
    }

    const isSuperadmin = user.role === GlobalRole.SUPERADMIN;
    const membership = await transaction.membership.findFirst({
      where: { tenantId: tenant.id, userId: user.id },
    });

    if (
      !isSuperadmin &&
      (!membership || membership.status !== MembershipStatus.ACTIVE)
    ) {
      throw new TenantAccessError(
        "TENANT_FORBIDDEN",
        "Usuário não possui vínculo ativo com este tenant.",
      );
    }

    return {
      tenantId: tenant.id,
      tenant,
      userId: user.id,
      membership,
      isSuperadmin,
    };
  });
}

export function requireTenantRole(
  context: TenantContext,
  roles: TenantRole[],
): void {
  if (context.isSuperadmin) return;

  if (!context.membership || !roles.includes(context.membership.role)) {
    throw new TenantAccessError(
      "TENANT_ROLE_FORBIDDEN",
      "Papel insuficiente para esta operação.",
    );
  }
}
