import Image from "next/image";
import Link from "next/link";
import type { PublicHeroSection, PublicProduct } from "../../../lib/catalog/types";

function safeStoreHref(value: string | undefined, fallbackHref: string): string {
  if (value?.startsWith("#")) return value;
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return fallbackHref;
}

export function HeroSection({
  section,
  fallbackHref,
  featuredProduct,
}: {
  section?: PublicHeroSection;
  fallbackHref: string;
  featuredProduct?: PublicProduct;
}) {
  const content = section?.content;
  const image = featuredProduct?.images[0];
  return (
    <section className="modabella-hero" aria-labelledby="modabella-hero-title">
      {image ? (
        <Image
          className="modabella-hero__image"
          src={image.url}
          alt={`Destaque da coleção: ${featuredProduct.name}`}
          fill
          sizes="(max-width: 700px) 100vw, 1180px"
          loading="eager"
          unoptimized
        />
      ) : null}
      <div className="modabella-hero__overlay" aria-hidden="true" />
      <div className="modabella-hero__glow" aria-hidden="true" />
      <div className="modabella-hero__content">
        <span className="modabella-hero__eyebrow">Nova coleção</span>
        <h1 id="modabella-hero-title">{content?.title ?? "Vista sua melhor versão"}</h1>
        <p>{content?.subtitle ?? "Novidades selecionadas para todos os momentos."}</p>
        <Link className="modabella-button" href={safeStoreHref(content?.ctaHref, fallbackHref)}>
          {content?.ctaLabel ?? "Ver coleção"}
        </Link>
      </div>
      {!image ? <div className="modabella-hero__shape" aria-hidden="true">MB</div> : null}
    </section>
  );
}
