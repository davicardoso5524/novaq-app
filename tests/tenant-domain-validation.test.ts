import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tenantCreateSchema, tenantUpdateSchema } from "../src/lib/validation/tenant";

const previousBaseDomain = process.env.PLATFORM_CATALOG_BASE_DOMAIN;

describe("tenant public domain validation", () => {
  beforeEach(() => {
    process.env.PLATFORM_CATALOG_BASE_DOMAIN = "catalog.novaq.com.br";
  });

  afterEach(() => {
    if (previousBaseDomain === undefined) delete process.env.PLATFORM_CATALOG_BASE_DOMAIN;
    else process.env.PLATFORM_CATALOG_BASE_DOMAIN = previousBaseDomain;
  });

  it.each(["catalog.novaq.com.br", "cliente.catalog.novaq.com.br"])(
    "rejects reserved platform namespace %s when creating a tenant",
    (publicDomain) => {
      const result = tenantCreateSchema.safeParse({
        name: "Loja Cliente",
        slug: "loja-cliente",
        ownerEmail: "owner@example.com",
        publicDomain,
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects a reserved platform subdomain when editing a tenant", () => {
    const result = tenantUpdateSchema.safeParse({
      publicDomain: "outra.catalog.novaq.com.br",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an external custom domain", () => {
    expect(
      tenantUpdateSchema.safeParse({ publicDomain: "loja.cliente.com.br" }).success,
    ).toBe(true);
  });
});
