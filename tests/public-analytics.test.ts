import { ProductStatus, TenantStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  product: { findFirst: vi.fn() },
  pageView: { create: vi.fn() },
}));
const resolveTenantFromHost = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/prisma", () => ({ prisma: database }));
vi.mock("../src/lib/tenant/resolve", () => ({ resolveTenantFromHost }));

import { POST } from "../src/app/api/public/analytics/route";

const now = new Date("2026-07-30T16:00:00.000Z");
const tenant = {
  id: "tenant-modabella",
  slug: "modabella-demo",
  name: "ModaBella Demo",
  status: TenantStatus.ACTIVE,
  publicDomain: null,
  subdomain: "modabella-demo",
  planId: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};

function analyticsRequest(body: unknown, host = "modabella-demo.localhost:3002") {
  return new Request("http://localhost/api/public/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-host": host },
    body: JSON.stringify(body),
  });
}

function streamedAnalyticsRequest(chunks: string[], onCancel: () => void) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
    cancel() {
      onCancel();
    },
  });

  return new Request("http://localhost/api/public/analytics", {
    method: "POST",
    headers: { "content-type": "application/json", host: "modabella-demo.localhost:3002" },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("POST /api/public/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTenantFromHost.mockResolvedValue(tenant);
    database.product.findFirst.mockResolvedValue({ id: "product-aurora" });
    database.pageView.create.mockResolvedValue({
      id: "view-1",
      event: "PRODUCT_VIEW",
      path: "/produto/vestido-aurora",
      productId: "product-aurora",
      searchTerm: null,
      createdAt: now,
    });
  });

  it("returns 404 and writes nothing when the request host has no active tenant", async () => {
    resolveTenantFromHost.mockResolvedValueOnce(null);

    const response = await POST(analyticsRequest({ event: "PAGE_VIEW", path: "/" }, "unknown.test"));

    expect(response.status).toBe(404);
    expect(database.product.findFirst).not.toHaveBeenCalled();
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it("returns 422 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/public/analytics", {
        method: "POST",
        headers: { "content-type": "application/json", host: "modabella-demo.localhost:3002" },
        body: "{invalid",
      }),
    );

    expect(response.status).toBe(422);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it.each([
    "//evil.example/collect?email=owner@modabella.local&token=secret",
    "/produto?email=owner@modabella.local&token=secret",
    "/produto#token-secret",
    "/catalogo\\..\\painel",
    "/catalogo/../painel",
    "/%2e%2e/painel",
    "/%2F%2Fevil.example/collect",
    "/catalogo%5c..%5cpainel",
    "/linha\ncontrole",
  ])("rejects a path that is not a strict local pathname: %s", async (path) => {
    const response = await POST(analyticsRequest({ event: "PAGE_VIEW", path }));

    expect(response.status).toBe(422);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it("returns 413 from Content-Length before parsing a body above 8 KiB", async () => {
    const response = await POST(
      new Request("http://localhost/api/public/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "modabella-demo.localhost:3002",
          "content-length": "8193",
        },
        body: JSON.stringify({ event: "PAGE_VIEW", path: "/" }),
      }),
    );

    expect(response.status).toBe(413);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it("cancels a real headerless stream as soon as its body exceeds 8 KiB", async () => {
    let canceled = false;
    const request = streamedAnalyticsRequest(
      [
        '{"event":"PAGE_VIEW","path":"/","padding":"',
        "x".repeat(4096),
        "x".repeat(4096),
        '"}',
      ],
      () => {
        canceled = true;
      },
    );
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(canceled).toBe(true);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it.each(["PAGE_VIEW", "WHATSAPP_CLICK"] as const)(
    "accepts the public event %s without optional product data",
    async (event) => {
      database.pageView.create.mockResolvedValueOnce({
        id: `view-${event}`,
        event,
        path: "/",
        productId: null,
        searchTerm: null,
        createdAt: now,
      });

      const response = await POST(analyticsRequest({ event, path: "/" }));

      expect(response.status).toBe(201);
      expect(database.pageView.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ event }) }),
      );
    },
  );

  it.each([
    { event: "LOGIN", path: "/" },
    { event: "PAGE_VIEW", path: "/", tenantId: "tenant-attacker" },
    { event: "PAGE_VIEW", path: "/", ip: "203.0.113.1" },
    { event: "PAGE_VIEW", path: `/${"x".repeat(2048)}` },
    { event: "SEARCH", path: "/busca", searchTerm: "x".repeat(121) },
    { event: "PRODUCT_VIEW", path: "/produto/vestido-aurora" },
  ])("returns 422 for an invalid or non-whitelisted payload %#", async (payload) => {
    const response = await POST(analyticsRequest(payload));

    expect(response.status).toBe(422);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it("creates an allowed event using only the tenant resolved from the host", async () => {
    const response = await POST(
      analyticsRequest({
        event: "PRODUCT_VIEW",
        path: "/produto/vestido-aurora",
        productSlug: "vestido-aurora",
      }),
    );

    expect(response.status).toBe(201);
    expect(resolveTenantFromHost).toHaveBeenCalledWith("modabella-demo.localhost:3002");
    expect(database.product.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: tenant.id,
        slug: "vestido-aurora",
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
        publishedAt: { lte: expect.any(Date) },
        category: { is: { active: true } },
      },
      select: { id: true },
    });
    expect(database.pageView.create).toHaveBeenCalledWith({
      data: {
        tenantId: tenant.id,
        event: "PRODUCT_VIEW",
        path: "/produto/vestido-aurora",
        productId: "product-aurora",
        searchTerm: null,
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
  });

  it("returns 422 when a product event references a product outside the public tenant DTO", async () => {
    database.product.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      analyticsRequest({
        event: "ADD_TO_CART",
        path: "/produto/produto-alheio",
        productSlug: "produto-alheio",
      }),
    );

    expect(response.status).toBe(422);
    expect(database.pageView.create).not.toHaveBeenCalled();
  });

  it("persists a normalized search event without request metadata or the raw body", async () => {
    database.pageView.create.mockResolvedValueOnce({
      id: "view-search",
      event: "SEARCH",
      path: "/busca",
      productId: null,
      searchTerm: "vestido rosa",
      createdAt: now,
    });

    const response = await POST(
      new Request("http://localhost/api/public/analytics", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "modabella-demo.localhost:3002",
          cookie: "session=secret",
          "user-agent": "private-agent",
          "x-forwarded-for": "203.0.113.1",
        },
        body: JSON.stringify({ event: "SEARCH", path: "/busca", searchTerm: "  vestido rosa  " }),
      }),
    );

    expect(response.status).toBe(201);
    expect(database.product.findFirst).not.toHaveBeenCalled();
    expect(database.pageView.create).toHaveBeenCalledWith({
      data: {
        tenantId: tenant.id,
        event: "SEARCH",
        path: "/busca",
        productId: null,
        searchTerm: "vestido rosa",
      },
      select: expect.any(Object),
    });
    expect(JSON.stringify(database.pageView.create.mock.calls[0])).not.toMatch(
      /cookie|user-agent|forwarded-for|private-agent|203\.0\.113\.1|session=secret/i,
    );
  });
});
