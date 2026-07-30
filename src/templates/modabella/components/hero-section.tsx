import Link from "next/link";
import type { PublicHeroSection } from "../../../lib/catalog/types";

function safeStoreHref(value: string | undefined): string {
  if (value?.startsWith("#")) return value;
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  return "/categorias/vestidos";
}

export function HeroSection({ section }: { section?: PublicHeroSection }) {
  const content = section?.content;
  return (
    <section className="modabella-hero" aria-labelledby="modabella-hero-title">
      <div className="modabella-hero__glow" aria-hidden="true" />
      <div className="modabella-hero__content">
        <span className="modabella-hero__eyebrow">Nova coleção</span>
        <h1 id="modabella-hero-title">{content?.title ?? "Vista sua melhor versão"}</h1>
        <p>{content?.subtitle ?? "Novidades selecionadas para todos os momentos."}</p>
        <Link className="modabella-button" href={safeStoreHref(content?.ctaHref)}>
          {content?.ctaLabel ?? "Ver coleção"}
        </Link>
      </div>
      <div className="modabella-hero__shape" aria-hidden="true">MB</div>
    </section>
  );
}
