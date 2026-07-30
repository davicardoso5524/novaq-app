import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicStore } from "@/lib/catalog/load-public-store";
import { CatalogPageShell } from "@/templates/modabella/components/catalog-page-shell";
import { ProductGrid } from "@/templates/modabella/components/product-grid";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const data = await loadPublicStore(host);
  if (!data?.theme) notFound();

  const { slug } = await params;
  const category = data.categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const products = data.products.filter((product) => product.categorySlug === category.slug);

  return (
    <CatalogPageShell data={data}>
      <section className="modabella-section" aria-labelledby="category-title">
        <Link className="text-sm font-bold text-[var(--store-accent)]" href="/">
          ← Voltar ao catálogo
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-accent)]">
              Categoria
            </p>
            <h1 id="category-title" className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">
              {category.name}
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>
        </div>
      </section>
      <ProductGrid
        products={products}
        title={`Seleção de ${category.name}`}
        emptyMessage="Nenhum produto disponível nesta categoria no momento."
      />
    </CatalogPageShell>
  );
}
