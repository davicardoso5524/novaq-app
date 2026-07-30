import Image from "next/image";
import Link from "next/link";
import { sanitizePublicImageUrl } from "../../../lib/catalog/public-image-url";
import type { PublicProduct } from "../../../lib/catalog/types";
import { ArrowIcon } from "./icons";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductGrid({
  products,
  title,
  categorySlug,
  emptyMessage = "Novos produtos estão chegando.",
}: {
  products: PublicProduct[];
  title: string;
  categorySlug?: string;
  emptyMessage?: string;
}) {
  return (
    <section id="novidades" className="modabella-section modabella-products" aria-labelledby="modabella-products-title">
      <div className="modabella-section__heading">
        <h2 id="modabella-products-title">{title}</h2>
        {categorySlug ? <Link href={`/categorias/${categorySlug}`}>Ver todos <ArrowIcon /></Link> : null}
      </div>
      {products.length ? (
        <div className="modabella-product-grid">
          {products.map((product, index) => {
            const image = product.images.find((item) => sanitizePublicImageUrl(item.url));
            const imageUrl = image ? sanitizePublicImageUrl(image.url) : undefined;
            return (
              <article className="modabella-product-card" key={product.slug}>
                <Link href={`/produto/${product.slug}`}>
                  <div className="modabella-product-card__image">
                    {image && imageUrl ? (
                      <Image src={imageUrl} alt={image.altText ?? product.name} fill sizes="(max-width: 640px) 50vw, 280px" loading={index === 0 ? "eager" : "lazy"} unoptimized />
                    ) : <span aria-hidden="true">✦</span>}
                  </div>
                  <div className="modabella-product-card__body">
                    <h3>{product.name}</h3>
                    <div className="modabella-product-card__prices">
                      <strong>{money.format(Number(product.price))}</strong>
                      {product.compareAtPrice ? <del>{money.format(Number(product.compareAtPrice))}</del> : null}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      ) : <p className="modabella-empty">{emptyMessage}</p>}
    </section>
  );
}
