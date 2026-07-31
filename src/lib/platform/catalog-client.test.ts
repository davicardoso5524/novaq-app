import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlatformCatalog } from "./catalog-client";

describe("platform catalog client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads an active catalog using the shared platform key", async () => {
    vi.stubEnv("PLATFORM_API_URL", "http://localhost:3001");
    vi.stubEnv("PLATFORM_SECRET_KEY", "shared-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        catalog: {
          id: "catalog-1",
          slug: "moda-bella",
          name: "Moda Bella",
          description: "Moda feminina",
          status: "ativo",
          template: "moda-bella",
          publicUrl: "http://moda-bella.localhost:3002",
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));

    await expect(getPlatformCatalog("moda-bella")).resolves.toMatchObject({
      slug: "moda-bella",
      status: "ativo",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/internal/catalogos/moda-bella",
      expect.objectContaining({
        headers: { "X-Platform-Key": "shared-secret" },
      }),
    );
  });

  it("returns a paused catalog so the public app can render maintenance", async () => {
    vi.stubEnv("PLATFORM_API_URL", "http://localhost:3001");
    vi.stubEnv("PLATFORM_SECRET_KEY", "shared-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        catalog: {
          id: "catalog-1",
          slug: "moda-bella",
          name: "Moda Bella",
          description: null,
          status: "pausado",
          template: "moda-bella",
          publicUrl: null,
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
      }),
      { status: 200 },
    )));

    await expect(getPlatformCatalog("moda-bella")).resolves.toMatchObject({
      status: "pausado",
    });
  });

  it("throws a clear error when the platform rejects the request", async () => {
    vi.stubEnv("PLATFORM_API_URL", "http://localhost:3001");
    vi.stubEnv("PLATFORM_SECRET_KEY", "shared-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(getPlatformCatalog("moda-bella")).rejects.toThrow("PLATFORM_UNAUTHORIZED");
  });
});
