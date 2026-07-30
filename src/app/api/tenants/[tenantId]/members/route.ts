import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { apiError, errorResponse, parseJson } from "@/lib/http/api";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, requireTenantRole } from "@/lib/tenant/require-context";
import { membershipCreateSchema } from "@/lib/validation/tenant";

type RouteContext = { params: Promise<{ tenantId: string }> };
const managerRoles = [MembershipRole.OWNER, MembershipRole.ADMIN];

export async function GET(_request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    requireTenantRole(context, managerRoles);

    const members = await prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, ativo: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, route: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  try {
    const { tenantId } = await route.params;
    const context = await requireTenantContext({ tenantId, userId: session.user.id });
    requireTenantRole(context, managerRoles);
    const input = await parseJson(request, membershipCreateSchema);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.ativo) {
      return apiError(
        422,
        "USER_NOT_FOUND",
        "O usuário precisa possuir uma conta ativa; convites ainda não estão disponíveis.",
      );
    }

    const existing = await prisma.membership.findFirst({
      where: { tenantId, userId: user.id },
    });
    if (existing) return apiError(409, "MEMBERSHIP_CONFLICT", "Usuário já vinculado ao tenant.");

    const membership = await prisma.$transaction(async (transaction) => {
      const created = await transaction.membership.create({
        data: {
          tenantId,
          userId: user.id,
          role: input.role,
          status: MembershipStatus.PENDING,
        },
      });
      await transaction.auditLog.create({
        data: {
          tenantId,
          userId: session.user.id,
          action: "membership.created",
          entity: "Membership",
          entityId: created.id,
          metadata: { memberUserId: user.id, role: input.role },
        },
      });
      return created;
    });

    return Response.json(
      { membership, user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
