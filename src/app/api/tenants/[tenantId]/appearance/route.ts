import { auth } from "@/lib/auth/config";
import { canManageTenant } from "@/lib/auth/roles";
import { apiError, errorResponse, parseJson } from "@/lib/http/api";
import {
  getTenantAppearance,
  saveTenantAppearanceDraft,
} from "@/lib/appearance/repository";
import { appearanceDraftSchema } from "@/lib/appearance/schema";
import { requireTenantContext } from "@/lib/tenant/require-context";

type RouteContext = { params: Promise<{ tenantId: string }> };

export async function GET(_request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    const appearance = await getTenantAppearance(context);
    return Response.json(appearance);
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
    if (!context.isSuperadmin && (!context.membership || !canManageTenant(context.membership.role))) {
      return apiError(403, "TENANT_ROLE_FORBIDDEN", "Papel insuficiente para esta operação.");
    }

    const draft = await parseJson(request, appearanceDraftSchema);
    const appearance = await saveTenantAppearanceDraft({ context, draft });
    return Response.json(appearance);
  } catch (error) {
    return errorResponse(error);
  }
}
