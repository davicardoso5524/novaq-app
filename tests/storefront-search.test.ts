import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicStoreData } from "../src/lib/catalog/types";

const requestHeaders = vi.hoisted(() => ({
  get: vi.fn<(name: string) => string | null>(),
}));
const loadPublicStore = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/headers", () => ({ headers: vi.fn(async () => requestHeaders) }));
vi.mock("next/navigation", () => ({ notFound }));
vi.mock("../src/lib/catalog/load-public-store", () => ({ loadPublicStore }));

import SearchPage from "../src/app/busca/page";
import CategoryPage from "../src/app/categorias/[slug]/page";
import ProductPage from "../src/app/produto/[slug]/page";
import {
  normalizeSearchTerm,
  searchPublicProducts,
} from "../src/lib/catalog/search";

const catalog = {
  tenant: { name: "Moda Bella", slug: "modabella" },
  theme: { template: "MODABELLA", config: { accentColor: "#6C3CE0" } },
  sections: [],
  categories: [
    { name: "Vestidos", slug: "vestidos", position: 0 },
    { name: "Acessórios", slug: "acessorios", position: 1 },
  ],
  products: [
    {
      name: "Vestido Áurea",
      slug: "vestido-aurea",
      description: "Vestido midi em tecido leve.",
      categorySlug: "vestidos",
      price: "189.90",
      compareAtPrice: "229.90",
      variants: [
        { sku: "MB-AUREA-P", size: "P", color: "Rosa", stock: 3, price: "199.90" },
        { sku: "MB-AUREA-M", size: "M", color: "Rosa", stock: 0, price: "209.90" },
      ],
      images: [
        { url: "javascript:alert(1)", altText: "Imagem insegura" },
        { url: "https://cdn.example.com/aurea.jpg", altText: "   " },
      ],
    },
    {
      name: "Bolsa Luna",
      slug: "bolsa-luna",
      description: "Bolsa compacta para festas.",
      categorySlug: "acessorios",
      price: "129.90",
      compareAtPrice: null,
      variants: [{ sku: "MB-LUNA-UN", size: "Único", color: "Caramelo", stock: 5, price: null }],
      images: [{ url: "/catalogo/bolsa-luna.jpg", altText: "Bolsa Luna caramelo" }],
    },
  ],
  settings: {
    name: "Moda Bella Fortaleza",
    whatsAppNumber: "5585987654321",
    texts: { announcement: "Frete grátis em Fortaleza." },
  },
} satisfies PublicStoreData;

describe("public storefront discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestHeaders.get.mockImplementation((name) =>
      name === "x-forwarded-host" ? "modabella.example.com" : null,
    );
    loadPublicStore.mockResolvedValue(catalog);
  });

  it("normalizes accents, case and repeated whitespace", () => {
    expect(normalizeSearchTerm("  ÁUREA   Rosa  ")).toBe("aurea rosa");
  });

  it("searches only products present in the resolved public DTO", () => {
    expect(searchPublicProducts(catalog, "  VESTÍDO   áurea ").map(({ slug }) => slug)).toEqual([
      "vestido-aurea",
    ]);
    expect(searchPublicProducts(catalog, "acessorios").map(({ slug }) => slug)).toEqual([
      "bolsa-luna",
    ]);
    expect(searchPublicProducts(catalog, "produto de outro tenant")).toEqual([]);
  });

  it("returns no products for an empty term", () => {
    expect(searchPublicProducts(catalog, "   ")).toEqual([]);
  });

  it("renders a safe server-side search result using Next 16 search params", async () => {
    const page = await SearchPage({ searchParams: Promise.resolve({ q: "<script>Áurea</script>" }) });
    const html = renderToStaticMarkup(page);

    expect(loadPublicStore).toHaveBeenCalledWith("modabella.example.com");
    expect(html).not.toContain("<script>Áurea</script>");
    expect(html).toContain("&lt;script&gt;Áurea&lt;/script&gt;");
    expect(html).toContain("Nenhum produto encontrado");
    expect(html).not.toContain('aria-current="page"');
  });

  it("lists only products belonging to the requested public category", async () => {
    const page = await CategoryPage({ params: Promise.resolve({ slug: "vestidos" }) });
    const html = renderToStaticMarkup(page);

    expect(loadPublicStore).toHaveBeenCalledWith("modabella.example.com");
    expect(html).toContain("Vestido Áurea");
    expect(html).not.toContain("Bolsa Luna");
    expect(html).toContain('class="is-active" aria-current="page" href="/categorias/vestidos"');
  });

  it("keeps the secondary category href aligned with its active navigation state", async () => {
    const page = await CategoryPage({ params: Promise.resolve({ slug: "acessorios" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Acessórios");
    expect(html).toContain(
      'class="is-active" aria-current="page" href="/categorias/acessorios"',
    );
    expect(html).not.toContain(
      'class="is-active" aria-current="page" href="/categorias/vestidos"',
    );
  });

  it("returns not found for a category outside the resolved DTO", async () => {
    await expect(
      CategoryPage({ params: Promise.resolve({ slug: "categoria-inexistente" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("returns not found for a product outside the resolved tenant DTO", async () => {
    await expect(
      ProductPage({ params: Promise.resolve({ slug: "produto-alheio" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("renders safe product media, prices and only variants with stock", async () => {
    const page = await ProductPage({ params: Promise.resolve({ slug: "vestido-aurea" }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Vestido Áurea");
    expect(html).toContain("199,90");
    expect(html).toContain("229,90");
    expect(html).toContain("P · Rosa");
    expect(html).not.toContain("M · Rosa");
    expect(html).toContain("3 unidades disponíveis");
    expect(html).toContain("Adicionar ao carrinho");
    expect(html).toContain('name="sku"');
    expect(html).toContain('value="MB-AUREA-P"');
    expect(html).toContain('name="variantLabel" type="hidden" value="P · Rosa"');
    expect(html).toContain('name="unitPrice" type="hidden" value="199.90"');
    expect(html).toContain("https://cdn.example.com/aurea.jpg");
    expect(html).toContain('alt="Vestido Áurea"');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("modabella-bottom-nav");
  });

  it("does not render ModaBella discovery routes for a reserved template", async () => {
    loadPublicStore.mockResolvedValue({
      ...catalog,
      theme: { ...catalog.theme, template: "TEMPLATE_02" },
    });

    const routes = [
      () => SearchPage({ searchParams: Promise.resolve({ q: "vestido" }) }),
      () => CategoryPage({ params: Promise.resolve({ slug: "vestidos" }) }),
      () => ProductPage({ params: Promise.resolve({ slug: "vestido-aurea" }) }),
    ];

    for (const openRoute of routes) {
      await expect(openRoute()).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(notFound).toHaveBeenCalledTimes(3);
  });
});
