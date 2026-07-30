import type { PublicProduct, PublicStoreData } from "./types";

export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchPublicProducts(
  data: PublicStoreData,
  term: string,
): PublicProduct[] {
  const normalizedTerm = normalizeSearchTerm(term);
  if (!normalizedTerm) return [];

  const terms = normalizedTerm.split(" ");
  const categoryNames = new Map(
    data.categories.map((category) => [category.slug, category.name]),
  );

  return data.products.filter((product) => {
    const searchableText = normalizeSearchTerm(
      [
        product.name,
        product.description ?? "",
        categoryNames.get(product.categorySlug) ?? product.categorySlug,
      ].join(" "),
    );

    return terms.every((part) => searchableText.includes(part));
  });
}
