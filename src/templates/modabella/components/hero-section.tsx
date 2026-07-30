import Image from "next/image";
import Link from "next/link";
import type { PublicHeroSection } from "../../../lib/catalog/types";
import { sanitizePublicImageUrl } from "../../../lib/catalog/public-image-url";

function safeStoreHref(value: string | undefined, fallbackHref: string): string {
  if (value?.startsWith("#")) return value;
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return fallbackHref;
}

export function HeroSection({
  section,
  fallbackHref,
}: {
  section?: PublicHeroSection;
  fallbackHref: string;
}) {
  const content = section?.content;
  const imageUrl = sanitizePublicImageUrl(content?.imageUrl);
  const imageAlt = content?.imageAlt ?? "";
  return (
    <section className="modabella-hero" aria-labelledby="modabella-hero-title">
      {imageUrl ? (
        <Image
          className="modabella-hero__image"
          src={imageUrl}
          alt={imageAlt}
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
      {!imageUrl ? <div className="modabella-hero__shape" aria-hidden="true">MB</div> : null}
    </section>
  );
}
