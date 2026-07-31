import { z } from "zod";

const catalogSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["ativo", "pausado", "suspenso"]),
  template: z.string(),
  publicUrl: z.string().nullable(),
  updatedAt: z.string(),
});

const responseSchema = z.object({ catalog: catalogSchema });
export type PlatformCatalog = z.infer<typeof catalogSchema>;

export class PlatformCatalogError extends Error {
  constructor(public readonly code: "PLATFORM_UNAUTHORIZED" | "PLATFORM_NOT_FOUND" | "PLATFORM_UNAVAILABLE") {
    super(code);
  }
}

export async function getPlatformCatalog(slug: string): Promise<PlatformCatalog> {
  const baseUrl = (process.env.PLATFORM_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const key = process.env.PLATFORM_SECRET_KEY ?? "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${baseUrl}/api/internal/catalogos/${encodeURIComponent(slug)}`, {
      headers: { "X-Platform-Key": key },
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 401) throw new PlatformCatalogError("PLATFORM_UNAUTHORIZED");
    if (response.status === 404) throw new PlatformCatalogError("PLATFORM_NOT_FOUND");
    if (!response.ok) throw new PlatformCatalogError("PLATFORM_UNAVAILABLE");

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new PlatformCatalogError("PLATFORM_UNAVAILABLE");
    return parsed.data.catalog;
  } catch (error) {
    if (error instanceof PlatformCatalogError) throw error;
    throw new PlatformCatalogError("PLATFORM_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}
