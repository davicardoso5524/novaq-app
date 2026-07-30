import { MembershipRole } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { apiError, errorResponse, parseJson } from "@/lib/http/api";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireTenantRole } from "@/lib/tenant/require-context";
import { tenantUpdateSchema } from "@/lib/validation/tenant";

type RouteContext = { params: Promise<{ tenantId: string }> };

export async function GET(_request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    return Response.json({
      tenant: context.tenant,
      role: context.isSuperadmin ? "SUPERADMIN" : context.membership?.role,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    const input = await parseJson(request, tenantUpdateSchema);
    requireTenantRole(context, [MembershipRole.OWNER]);

    if (input.status && !context.isSuperadmin) {
      return apiError(403, "STATUS_FORBIDDEN", "Apenas superadmins alteram o status do tenant.");
    }

    if (input.publicDomain) {
      const collision = await prisma.tenant.findFirst({
        where: { publicDomain: input.publicDomain, NOT: { id: tenantId } },
      });
      if (collision) return apiError(409, "DOMAIN_CONFLICT", "Domínio já utilizado.");
    }

    const tenant = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.tenant.update({
        where: { id: tenantId },
        data: input,
      });
      await transaction.auditLog.create({
        data: {
          tenantId,
          userId: session.user.id,
          action: "tenant.updated",
          entity: "Tenant",
          entityId: tenantId,
          metadata: { fields: Object.keys(input) },
        },
      });
      return updated;
    });

    return Response.json({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}
