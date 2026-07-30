import { ProductStatus } from "@prisma/client";
import { apiError } from "@/lib/http/api";
import { prisma } from "@/lib/prisma";
import { resolveTenantFromHost } from "@/lib/tenant/resolve";
import { publicAnalyticsSchema } from "@/lib/validation/public-analytics";

function requestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
}

export async function POST(request: Request): Promise<Response> {
  const tenant = await resolveTenantFromHost(requestHost(request));
  if (!tenant) {
    return apiError(404, "PUBLIC_TENANT_NOT_FOUND", "Catálogo não encontrado.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(422, "VALIDATION_ERROR", "Dados inválidos.");
  }

  const parsed = publicAnalyticsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const input = parsed.data;
  let productId: string | null = null;

  if (input.productSlug) {
    const product = await prisma.product.findFirst({
      where: {
        tenantId: tenant.id,
        slug: input.productSlug,
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
        publishedAt: { lte: new Date() },
        category: { is: { active: true } },
      },
      select: { id: true },
    });

    if (!product) {
      return apiError(422, "PUBLIC_PRODUCT_NOT_FOUND", "Produto público inválido.");
    }
    productId = product.id;
  }

  const analytics = await prisma.pageView.create({
    data: {
      tenantId: tenant.id,
      event: input.event,
      path: input.path,
      productId,
      searchTerm: input.searchTerm ?? null,
    },
    select: {
      id: true,
      event: true,
      path: true,
      productId: true,
      searchTerm: true,
      createdAt: true,
    },
  });

  return Response.json({ analytics }, { status: 201 });
}
