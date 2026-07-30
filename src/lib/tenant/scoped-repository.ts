import { TenantAccessError, type TenantContext } from "./types";

export function tenantFilter(context: TenantContext): { tenantId: string } {
  if (
    !context.tenantId ||
    context.tenant.id !== context.tenantId ||
    !context.userId
  ) {
    throw new TenantAccessError(
      "INVALID_TENANT_CONTEXT",
      "Contexto de tenant inválido.",
    );
  }

  return { tenantId: context.tenantId };
}
