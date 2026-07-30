import { describe, expect, it } from "vitest";
import { getModaBellaSeed } from "../src/lib/catalog/modabella-seed";

describe("getModaBellaSeed", () => {
  it("provides a publishable ModaBella catalog configuration", () => {
    const seed = getModaBellaSeed();

    expect(seed.theme.template).toBe("MODABELLA");
    expect(seed.settings.whatsAppNumber).toMatch(/^55\d{10,11}$/);
    expect(seed.categories.length).toBeGreaterThanOrEqual(2);

    const productSlugs = seed.products.map((product) => product.slug);
    expect(new Set(productSlugs).size).toBe(productSlugs.length);

    for (const product of seed.products) {
      expect(product.price).toBeGreaterThan(0);
      expect(product.media.length).toBeGreaterThan(0);
      expect(product.media.every((media) => media.altText.trim().length > 0)).toBe(true);
    }
  });
});
