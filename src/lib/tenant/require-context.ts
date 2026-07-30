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
    const user = await transaction.user.findFirst({
      where: { id: input.userId, ativo: true },
    });

    if (!user) {
      throw new TenantAccessError(
        "USER_UNAUTHORIZED",
        "Usuário inexistente ou inativo.",
      );
    }

    const isSuperadmin = user.role === GlobalRole.SUPERADMIN;
    const tenant = await transaction.tenant.findFirst({
      where: {
        id: input.tenantId,
        deletedAt: null,
        ...(isSuperadmin ? {} : { status: TenantStatus.ACTIVE }),
      },
    });
    if (!tenant) {
      throw new TenantAccessError(
        "TENANT_NOT_FOUND",
        "Tenant inexistente ou indisponível.",
      );
    }

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
