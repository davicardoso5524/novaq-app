import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicProduct, PublicStoreData } from "../src/lib/catalog/types";
import {
  addOrIncrementCartItem,
  addCartItemWithResult,
  CartProvider,
  cartStorageKey,
  loadCartFromStorage,
  resolveHydrationResult,
  type CartItem,
} from "../src/components/storefront/cart-provider";
import { CartPageContent } from "../src/components/storefront/cart-page-content";
import { ProductPurchaseForm } from "../src/templates/modabella/components/product-purchase-form";
import {
  EmptyWhatsAppQuoteError,
  buildWhatsAppQuote,
  moneyToCents,
  normalizeBrazilianPhone,
} from "../src/lib/catalog/whatsapp";

const products: PublicProduct[] = [
  {
    name: "Vestido Áurea & Sol",
    slug: "vestido-aurea",
    description: null,
    categorySlug: "vestidos",
    price: "189.90",
    compareAtPrice: null,
    images: [],
    variants: [
      { sku: "AUREA-P", size: "P", color: "Rosa", stock: 2, price: "199.90" },
      { sku: "AUREA-M", size: "M", color: "Azul", stock: 4, price: null },
    ],
  },
];

const productWithoutVariants: PublicProduct = {
  name: "Vale-presente",
  slug: "vale-presente",
  description: null,
  categorySlug: "presentes",
  price: "50.00",
  compareAtPrice: null,
  images: [],
  variants: [],
};

describe("tenant cart and WhatsApp quote", () => {
  it("converts decimal money to integer cents without floating-point addition", () => {
    expect(moneyToCents("19.90")).toBe(1990);
    expect(moneyToCents("0.10")).toBe(10);
    expect(moneyToCents("189")).toBe(18900);
    expect(() => moneyToCents("1.999")).toThrow("Valor monetário inválido");
  });

  it("normalizes valid Brazilian phones and rejects malformed numbers", () => {
    expect(normalizeBrazilianPhone("(85) 98765-4321")).toBe("5585987654321");
    expect(normalizeBrazilianPhone("+55 (85) 98765-4321")).toBe("5585987654321");
    expect(normalizeBrazilianPhone("(55) 98765-4321")).toBe("5555987654321");
    expect(() => normalizeBrazilianPhone("1234")).toThrow("Telefone brasileiro inválido");
  });

  it("builds a deterministic encoded quote with variants, quantities and total", () => {
    const quote = buildWhatsAppQuote({
      phone: "+55 (85) 98765-4321",
      storeName: "Moda Bella & Cia",
      publicUrl: "https://modabella.novaq.app/carrinho",
      items: [
        {
          name: "Vestido Áurea & Sol",
          variantLabel: "P · Rosa",
          quantity: 2,
          unitPrice: 19990,
        },
        { name: "Bolsa Luna", quantity: 1, unitPrice: 12990 },
      ],
    });

    expect(quote.message).toBe(
      "Olá! Gostaria de solicitar um orçamento na Moda Bella & Cia.\n\n" +
        "1. Vestido Áurea & Sol — P · Rosa\n2 × R$ 199,90 = R$ 399,80\n\n" +
        "2. Bolsa Luna\n1 × R$ 129,90 = R$ 129,90\n\n" +
        "Total: R$ 529,70\n" +
        "Catálogo: https://modabella.novaq.app/carrinho",
    );
    expect(quote.url).toBe(
      `https://wa.me/5585987654321?text=${encodeURIComponent(quote.message)}`,
    );
  });

  it("does not generate a quote for an empty cart or invalid quantity", () => {
    expect(() =>
      buildWhatsAppQuote({
        phone: "5585987654321",
        storeName: "Moda Bella",
        publicUrl: "https://modabella.novaq.app/carrinho",
        items: [],
      }),
    ).toThrow(EmptyWhatsAppQuoteError);
    expect(() =>
      buildWhatsAppQuote({
        phone: "5585987654321",
        storeName: "Moda Bella",
        publicUrl: "https://modabella.novaq.app/carrinho",
        items: [{ name: "Vestido", quantity: 0, unitPrice: 19990 }],
      }),
    ).toThrow("Quantidade inválida");
  });

  it("does not announce an empty cart before localStorage hydration", () => {
    const catalog: PublicStoreData = {
      tenant: { name: "Moda Bella", slug: "modabella-demo" },
      theme: { template: "MODABELLA", config: {} },
      sections: [],
      categories: [],
      products,
      settings: {
        name: "Moda Bella",
        whatsAppNumber: "5585987654321",
        texts: {},
      },
    };
    const html = renderToStaticMarkup(
      createElement(
        CartProvider,
        { catalog },
        createElement(CartPageContent, {
          publicUrl: "https://modabella.novaq.app/carrinho",
          storeName: catalog.settings.name,
          whatsAppNumber: catalog.settings.whatsAppNumber,
        }),
      ),
    );

    expect(html).toContain("Carregando carrinho");
    expect(html).not.toContain("Seu carrinho está vazio");
    expect(html).not.toContain("wa.me");
  });

  it("keeps the add action disabled until localStorage hydration completes", () => {
    const catalog: PublicStoreData = {
      tenant: { name: "Moda Bella", slug: "modabella-demo" },
      theme: { template: "MODABELLA", config: {} },
      sections: [],
      categories: [],
      products,
      settings: { name: "Moda Bella", whatsAppNumber: null, texts: {} },
    };
    const html = renderToStaticMarkup(
      createElement(
        CartProvider,
        { catalog },
        createElement(ProductPurchaseForm, {
          productSlug: "vestido-aurea",
          basePrice: "189.90",
          compareAtPrice: null,
          variants: products[0].variants,
        }),
      ),
    );

    expect(html).toContain('disabled="" type="submit"');
  });

  it("uses an isolated localStorage key for each tenant", () => {
    expect(cartStorageKey("modabella-demo")).toBe("novaq:cart:modabella-demo:v1");
    expect(cartStorageKey("outra-loja")).not.toBe(cartStorageKey("modabella-demo"));
  });

  it("rejects malformed persisted payloads", () => {
    const storage = {
      getItem: () => JSON.stringify({ version: 1, items: [{ slug: "vestido-aurea", quantity: 0 }] }),
    };

    expect(loadCartFromStorage(storage, "modabella-demo", products)).toEqual([]);
  });

  it("rehydrates persisted identity against current catalog price and stock", () => {
    const storage = {
      getItem: (key: string) => {
        expect(key).toBe("novaq:cart:modabella-demo:v1");
        return JSON.stringify({
          version: 1,
          items: [
            {
              slug: "vestido-aurea",
              variantId: "AUREA-P",
              quantity: 9,
              unitPrice: 1,
              name: "Preço adulterado",
            },
            { slug: "produto-removido", quantity: 1 },
          ],
        });
      },
    };

    expect(loadCartFromStorage(storage, "modabella-demo", products)).toEqual([
      {
        productId: "vestido-aurea",
        slug: "vestido-aurea",
        name: "Vestido Áurea & Sol",
        unitPrice: 19990,
        quantity: 2,
        maxQuantity: 2,
        variantId: "AUREA-P",
        variantLabel: "P · Rosa",
      },
    ] satisfies CartItem[]);
  });

  it("distinguishes variants and clamps additions to current public stock", () => {
    const first = addOrIncrementCartItem([], products, "vestido-aurea", "AUREA-P", 1);
    const clamped = addOrIncrementCartItem(first, products, "vestido-aurea", "AUREA-P", 8);
    const secondVariant = addOrIncrementCartItem(
      clamped,
      products,
      "vestido-aurea",
      "AUREA-M",
      1,
    );

    expect(secondVariant).toHaveLength(2);
    expect(secondVariant[0]).toMatchObject({ variantId: "AUREA-P", quantity: 2 });
    expect(secondVariant[1]).toMatchObject({
      variantId: "AUREA-M",
      quantity: 1,
      unitPrice: 18990,
    });
  });

  it("supports products without variants using base price and untracked inventory policy", () => {
    const result = addCartItemWithResult(
      [],
      [...products, productWithoutVariants],
      "vale-presente",
      undefined,
      1,
    );

    expect(result.added).toBe(true);
    expect(result.items).toEqual([
      {
        productId: "vale-presente",
        slug: "vale-presente",
        name: "Vale-presente",
        unitPrice: 5000,
        quantity: 1,
        maxQuantity: 99,
      },
    ]);
  });

  it("still requires an in-stock SKU when a product defines variants", () => {
    const result = addCartItemWithResult([], products, "vestido-aurea", undefined, 1);

    expect(result.added).toBe(false);
    expect(result.items).toEqual([]);
  });

  it("returns false and preserves state identity when an item already reached its limit", () => {
    const full = addCartItemWithResult([], products, "vestido-aurea", "AUREA-P", 2);
    const rejected = addCartItemWithResult(
      full.items,
      products,
      "vestido-aurea",
      "AUREA-P",
      1,
    );

    expect(rejected.added).toBe(false);
    expect(rejected.items).toBe(full.items);
    expect(rejected.items[0].quantity).toBe(2);
  });

  it("does not overwrite a cart mutation that happened while hydration was pending", () => {
    const restored = addCartItemWithResult([], products, "vestido-aurea", "AUREA-P", 1).items;
    const current = addCartItemWithResult([], products, "vestido-aurea", "AUREA-M", 1).items;

    expect(resolveHydrationResult(current, restored, 0, 1)).toBe(current);
    expect(resolveHydrationResult([], restored, 0, 0)).toBe(restored);
  });
});
