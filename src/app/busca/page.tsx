import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadPublicStore } from "@/lib/catalog/load-public-store";
import { searchPublicProducts } from "@/lib/catalog/search";
import { isAvailableStoreTemplate } from "@/lib/templates/registry";
import { CatalogPageShell } from "@/templates/modabella/components/catalog-page-shell";
import { ProductGrid } from "@/templates/modabella/components/product-grid";

type SearchPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const data = await loadPublicStore(host);
  if (!data?.theme || !isAvailableStoreTemplate(data, "MODABELLA")) notFound();

  const params = await searchParams;
  const rawTerm = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const term = rawTerm.trim();
  const products = searchPublicProducts(data, term);
  const resultLabel = `${products.length} ${products.length === 1 ? "resultado" : "resultados"}`;

  return (
    <CatalogPageShell data={data}>
      <section className="modabella-section" aria-labelledby="search-title">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-accent)]">
            Descobrir produtos
          </p>
          <h1 id="search-title" className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            Resultados da busca
          </h1>
          <form action="/busca" className="mt-5 flex flex-col gap-3 sm:flex-row" role="search">
            <label className="sr-only" htmlFor="catalog-search-term">
              Buscar no catálogo
            </label>
            <input
              className="min-h-12 flex-1 rounded-2xl border border-purple-100 bg-purple-50 px-4 text-gray-900 placeholder:text-gray-500"
              defaultValue={rawTerm}
              id="catalog-search-term"
              name="q"
              placeholder="O que você procura?"
              type="search"
            />
            <button className="min-h-12 rounded-2xl bg-[var(--store-accent)] px-6 font-bold text-white" type="submit">
              Buscar
            </button>
          </form>
          {term ? (
            <p className="mt-4 text-sm text-gray-600" aria-live="polite">
              {resultLabel} para <strong>“{rawTerm}”</strong>
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-600">Digite algo para buscar produtos.</p>
          )}
        </div>
      </section>

      {term ? (
        products.length ? (
          <ProductGrid products={products} title={resultLabel} />
        ) : (
          <section className="modabella-section" aria-label="Busca sem resultados">
            <p className="modabella-empty">
              Nenhum produto encontrado para “{rawTerm}”. Tente outro termo ou explore as categorias.
            </p>
          </section>
        )
      ) : null}
    </CatalogPageShell>
  );
}
