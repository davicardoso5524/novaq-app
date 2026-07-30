import { MembershipRole, MembershipStatus } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { canAccessPlatform } from "@/lib/auth/roles";
import { apiError, errorResponse, parseJson } from "@/lib/http/api";
import { prisma } from "@/lib/prisma";
import { tenantCreateSchema } from "@/lib/validation/tenant";

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");

  if (canAccessPlatform(session.user.role)) {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    return Response.json({ tenants });
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
      status: MembershipStatus.ACTIVE,
      tenant: { deletedAt: null },
    },
    include: { tenant: true },
    orderBy: { tenant: { name: "asc" } },
  });

  return Response.json({
    tenants: memberships.map(({ tenant, role }) => ({ ...tenant, role })),
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.ativo) return apiError(401, "UNAUTHORIZED", "Autenticação necessária.");
  if (!canAccessPlatform(session.user.role)) {
    return apiError(403, "PLATFORM_FORBIDDEN", "Apenas superadmins podem criar tenants.");
  }

  try {
    const input = await parseJson(request, tenantCreateSchema);
    const owner = await prisma.user.findUnique({ where: { email: input.ownerEmail } });
    if (!owner?.ativo) {
      return apiError(
        422,
        "OWNER_NOT_FOUND",
        "O owner precisa possuir uma conta ativa; convites ainda não estão disponíveis.",
      );
    }

    const collision = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: input.slug },
          { subdomain: input.slug },
          ...(input.publicDomain ? [{ publicDomain: input.publicDomain }] : []),
        ],
      },
    });
    if (collision) {
      return apiError(409, "TENANT_CONFLICT", "Slug, subdomínio ou domínio já utilizado.");
    }

    const tenant = await prisma.$transaction(async (transaction) => {
      const created = await transaction.tenant.create({
        data: {
          name: input.name,
          slug: input.slug,
          subdomain: input.slug,
          publicDomain: input.publicDomain ?? null,
        },
      });
      await transaction.membership.create({
        data: {
          tenantId: created.id,
          userId: owner.id,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });
      await transaction.auditLog.create({
        data: {
          tenantId: created.id,
          userId: session.user.id,
          action: "tenant.created",
          entity: "Tenant",
          entityId: created.id,
          metadata: { ownerUserId: owner.id },
        },
      });
      return created;
    });

    return Response.json({ tenant }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
