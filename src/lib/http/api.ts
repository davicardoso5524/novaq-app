import { Prisma } from "@prisma/client";
import { ZodError, type ZodSchema } from "zod";
import { TenantAccessError } from "../tenant/types";

export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  return schema.parse(await request.json());
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos.",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof SyntaxError) {
    return apiError(400, "INVALID_JSON", "Corpo JSON inválido.");
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return apiError(409, "RESOURCE_CONFLICT", "Registro já existente.");
  }

  if (error instanceof TenantAccessError) {
    const status =
      error.code === "USER_UNAUTHORIZED"
        ? 401
        : error.code === "TENANT_NOT_FOUND"
          ? 404
          : 403;
    return apiError(status, error.code, error.message);
  }

  console.error(error);
  return apiError(500, "INTERNAL_ERROR", "Erro interno.");
}
