import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadPublicStore } from "@/lib/catalog/load-public-store";
import { sanitizePublicImageUrl } from "@/lib/catalog/public-image-url";
import { isAvailableStoreTemplate } from "@/lib/templates/registry";
import { CatalogPageShell } from "@/templates/modabella/components/catalog-page-shell";
import { ProductPurchaseForm } from "@/templates/modabella/components/product-purchase-form";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const data = await loadPublicStore(host);
  if (!data?.theme || !isAvailableStoreTemplate(data, "MODABELLA")) notFound();

  const { slug } = await params;
  const product = data.products.find((item) => item.slug === slug);
  if (!product) notFound();

  const category = data.categories.find((item) => item.slug === product.categorySlug);
  const images = product.images.flatMap((image) => {
    const safeUrl = sanitizePublicImageUrl(image.url);
    return safeUrl ? [{ ...image, url: safeUrl }] : [];
  });

  return (
    <CatalogPageShell data={data} hideBottomNavigation>
      <article className="modabella-section pb-10">
        <Link className="text-sm font-bold text-[var(--store-accent)]" href={category ? `/categorias/${category.slug}` : "/"}>
          ← {category ? `Voltar para ${category.name}` : "Voltar ao catálogo"}
        </Link>

        <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)] lg:gap-12">
          <section aria-label={`Galeria de ${product.name}`}>
            {images.length ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div
                    className={`relative overflow-hidden rounded-3xl bg-purple-50 ${index === 0 ? "col-span-2 aspect-[4/4.6] sm:aspect-[4/3]" : "aspect-square"}`}
                    key={`${image.url}-${index}`}
                  >
                    <Image
                      alt={image.altText?.trim() || product.name}
                      className="object-cover"
                      fill
                      priority={index === 0}
                      sizes={index === 0 ? "(max-width: 1024px) 100vw, 56vw" : "(max-width: 1024px) 50vw, 28vw"}
                      src={image.url}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid aspect-[4/4.6] place-items-center rounded-3xl bg-purple-50 text-5xl font-extrabold text-[var(--store-accent)]" aria-label="Produto sem imagem disponível">
                MB
              </div>
            )}
          </section>

          <section aria-labelledby="product-title" className="self-start rounded-3xl bg-white p-5 shadow-sm sm:p-8 lg:sticky lg:top-28">
            {category ? (
              <Link className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-accent)]" href={`/categorias/${category.slug}`}>
                {category.name}
              </Link>
            ) : null}
            <h1 id="product-title" className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-gray-900">
              {product.name}
            </h1>

            <ProductPurchaseForm
              basePrice={product.price}
              compareAtPrice={product.compareAtPrice}
              productSlug={product.slug}
              variants={product.variants}
            />

            {product.description ? (
              <div className="mt-7 border-t border-purple-100 pt-6">
                <h2 className="font-bold text-gray-900">Descrição</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">{product.description}</p>
              </div>
            ) : null}

          </section>
        </div>
      </article>
    </CatalogPageShell>
  );
}
