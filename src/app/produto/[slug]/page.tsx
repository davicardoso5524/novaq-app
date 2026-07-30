import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { loadPublicStore } from "@/lib/catalog/load-public-store";
import { sanitizePublicImageUrl } from "@/lib/catalog/public-image-url";
import { CatalogPageShell } from "@/templates/modabella/components/catalog-page-shell";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ProductPage({ params }: ProductPageProps) {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const data = await loadPublicStore(host);
  if (!data?.theme) notFound();

  const { slug } = await params;
  const product = data.products.find((item) => item.slug === slug);
  if (!product) notFound();

  const category = data.categories.find((item) => item.slug === product.categorySlug);
  const images = product.images.flatMap((image) => {
    const safeUrl = sanitizePublicImageUrl(image.url);
    return safeUrl ? [{ ...image, url: safeUrl }] : [];
  });
  const availableVariants = product.variants.filter((variant) => variant.stock > 0);
  const totalStock = availableVariants.reduce((total, variant) => total + variant.stock, 0);

  return (
    <CatalogPageShell data={data}>
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
                      alt={image.altText ?? `${product.name}, imagem ${index + 1}`}
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

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <strong className="text-3xl text-orange-600">{money.format(Number(product.price))}</strong>
              {product.compareAtPrice ? (
                <del className="text-base text-gray-500">{money.format(Number(product.compareAtPrice))}</del>
              ) : null}
            </div>

            {product.description ? (
              <div className="mt-7 border-t border-purple-100 pt-6">
                <h2 className="font-bold text-gray-900">Descrição</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">{product.description}</p>
              </div>
            ) : null}

            <form action="/carrinho" className="mt-7 border-t border-purple-100 pt-6" method="get">
              <input name="produto" type="hidden" value={product.slug} />
              <fieldset disabled={!availableVariants.length}>
                <legend className="font-bold text-gray-900">Escolha uma opção</legend>
                {availableVariants.length ? (
                  <div className="mt-3 grid gap-2">
                    {availableVariants.map((variant, index) => {
                      const label = `${variant.size} · ${variant.color}`;
                      return (
                        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-purple-100 px-4 py-3 text-sm text-gray-700 has-[:checked]:border-[var(--store-accent)] has-[:checked]:bg-purple-50" key={`${variant.size}-${variant.color}-${index}`}>
                          <span className="flex items-center gap-3">
                            <input defaultChecked={index === 0} name="variante" required type="radio" value={label} />
                            <span className="font-semibold">{label}</span>
                          </span>
                          <span>{variant.stock} em estoque</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-gray-100 p-4 text-sm text-gray-600">Produto esgotado no momento.</p>
                )}
              </fieldset>
              <p className="mt-4 text-sm text-gray-600" aria-live="polite">
                {totalStock} {totalStock === 1 ? "unidade disponível" : "unidades disponíveis"}
              </p>
              <button
                className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--store-accent)] px-5 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                disabled={!availableVariants.length}
                type="submit"
              >
                Adicionar ao carrinho
              </button>
            </form>
          </section>
        </div>
      </article>
    </CatalogPageShell>
  );
}
