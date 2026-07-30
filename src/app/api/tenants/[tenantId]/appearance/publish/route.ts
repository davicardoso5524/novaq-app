import { auth } from "@/lib/auth/config";
import { canManageTenant } from "@/lib/auth/roles";
import { publishTenantAppearance } from "@/lib/appearance/repository";
import { apiError, errorResponse } from "@/lib/http/api";
import { requireTenantContext } from "@/lib/tenant/require-context";

type RouteContext = { params: Promise<{ tenantId: string }> };

export async function POST(_request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    if (!context.isSuperadmin && (!context.membership || !canManageTenant(context.membership.role))) {
      return apiError(403, "TENANT_ROLE_FORBIDDEN", "Papel insuficiente para esta operação.");
    }

    const appearance = await publishTenantAppearance({ context });
    return Response.json(appearance, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
