import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicStoreData } from "../src/lib/catalog/types";
import {
  renderStoreTemplate,
  TemplateUnavailableError,
} from "../src/lib/templates/registry";

const catalog = {
  tenant: { name: "Loja de teste", slug: "loja-de-teste" },
  theme: { template: "MODABELLA", config: { accentColor: "#6C3CE0" } },
  sections: [
    {
      type: "HERO",
      position: 0,
      content: {
        title: "Vista sua melhor versão",
        subtitle: "Peças escolhidas para todos os momentos.",
        ctaLabel: "Ver coleção",
        ctaHref: "#novidades",
      },
    },
    { type: "CATEGORIES", position: 1, content: { title: "Escolha por categoria" } },
    { type: "PRODUCT_FEED", position: 2, content: { title: "Destaques", limit: 4 } },
  ],
  categories: [
    { name: "Vestidos", slug: "vestidos", position: 0 },
    { name: "Acessórios", slug: "acessorios", position: 1 },
  ],
  products: [
    {
      name: "Vestido Aurora",
      slug: "vestido-aurora",
      description: "Vestido midi em tecido leve.",
      categorySlug: "vestidos",
      price: "189.90",
      compareAtPrice: "229.90",
      variants: [{ size: "M", color: "Rosa", stock: 4, price: null }],
      images: [{ url: "https://cdn.example.com/aurora.jpg", altText: "Vestido Aurora rosa" }],
    },
  ],
  settings: {
    name: "Moda Bella Fortaleza",
    whatsAppNumber: "5585987654321",
    texts: { announcement: "Frete grátis em Fortaleza." },
  },
} satisfies PublicStoreData;

describe("shared storefront template registry", () => {
  it("renders tenant content through the ModaBella template", () => {
    const before = JSON.stringify(catalog);
    const html = renderToStaticMarkup(<>{renderStoreTemplate(catalog)}</>);

    expect(html).toContain("Moda Bella Fortaleza");
    expect(html).toContain("Vista sua melhor versão");
    expect(html).toContain("Escolha por categoria");
    expect(html).toContain("Vestidos");
    expect(html).toContain("Vestido Aurora");
    expect(html).toContain('href="/produto/vestido-aurora"');
    expect(html).toContain('href="/categorias/vestidos"');
    expect(html).toContain('href="/busca"');
    expect(html).toContain('href="/carrinho"');
    expect(html).toContain('href="#novidades"');
    expect(html).toContain('id="novidades"');
    expect(html).toContain("189,90");
    expect(html).toContain('loading="eager"');
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it("rejects a reserved template without mutating catalog data", () => {
    const before = JSON.stringify(catalog);
    const unavailableCatalog: PublicStoreData = {
      ...catalog,
      theme: { ...catalog.theme, template: "TEMPLATE_02" },
    };

    expect(() => renderStoreTemplate(unavailableCatalog)).toThrow(TemplateUnavailableError);
    expect(JSON.stringify(catalog)).toBe(before);
    expect(JSON.stringify(unavailableCatalog.categories)).toBe(JSON.stringify(catalog.categories));
    expect(JSON.stringify(unavailableCatalog.products)).toBe(JSON.stringify(catalog.products));
  });

  it("does not render an unsafe hero link from tenant content", () => {
    const unsafeCatalog: PublicStoreData = {
      ...catalog,
      sections: catalog.sections.map((section) =>
        section.type === "HERO"
          ? { ...section, content: { ...section.content, ctaHref: "javascript:alert(1)" } }
          : section,
      ),
    };

    const html = renderToStaticMarkup(<>{renderStoreTemplate(unsafeCatalog)}</>);

    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="/categorias/vestidos"');
  });
});
