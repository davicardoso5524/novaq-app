import { ProductStatus } from "@prisma/client";
import { apiError } from "@/lib/http/api";
import { prisma } from "@/lib/prisma";
import { resolveTenantFromHost } from "@/lib/tenant/resolve";
import { publicAnalyticsSchema } from "@/lib/validation/public-analytics";

const MAX_ANALYTICS_BODY_BYTES = 8 * 1024;

class AnalyticsBodyTooLargeError extends Error {}

function requestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
}

function declaredBodyTooLarge(request: Request): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength || !/^\d+$/.test(contentLength)) return false;

  return Number(contentLength) > MAX_ANALYTICS_BODY_BYTES;
}

async function readLimitedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return JSON.parse("");

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let bodyText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > MAX_ANALYTICS_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new AnalyticsBodyTooLargeError();
    }
    bodyText += decoder.decode(value, { stream: true });
  }

  bodyText += decoder.decode();
  return JSON.parse(bodyText);
}

export async function POST(request: Request): Promise<Response> {
  const tenant = await resolveTenantFromHost(requestHost(request));
  if (!tenant) {
    return apiError(404, "PUBLIC_TENANT_NOT_FOUND", "Catálogo não encontrado.");
  }

  if (declaredBodyTooLarge(request)) {
    await request.body?.cancel().catch(() => undefined);
    return apiError(413, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede 8 KiB.");
  }

  let body: unknown;
  try {
    body = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof AnalyticsBodyTooLargeError) {
      return apiError(413, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede 8 KiB.");
    }
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
