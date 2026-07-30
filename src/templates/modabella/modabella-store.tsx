import type { CSSProperties } from "react";
import type { PublicHeroSection, PublicStoreData } from "../../lib/catalog/types";
import { BottomNavigation } from "./components/bottom-navigation";
import { CategoryStrip } from "./components/category-strip";
import { HeroSection } from "./components/hero-section";
import { ProductGrid } from "./components/product-grid";
import { StoreHeader } from "./components/store-header";

type StoreStyle = CSSProperties & { "--store-accent": string };

export function ModaBellaStore({ data }: { data: PublicStoreData }) {
  const hero = data.sections.find((section): section is PublicHeroSection => section.type === "HERO");
  const categoryTitle = data.sections.find((section) => section.type === "CATEGORIES")?.content.title ?? "Categorias";
  const feed = data.sections.find((section) => section.type === "PRODUCT_FEED");
  const products = data.products.slice(0, feed?.content.limit ?? data.products.length);
  const firstCategorySlug = data.categories[0]?.slug;
  const heroFallbackHref = firstCategorySlug
    ? `/categorias/${firstCategorySlug}`
    : "#novidades";
  const style: StoreStyle = { "--store-accent": data.theme?.config.accentColor ?? "#6C3CE0" };

  return (
    <div className="modabella-store" style={style}>
      {data.settings.texts.announcement ? <p className="modabella-announcement">{data.settings.texts.announcement}</p> : null}
      <StoreHeader name={data.settings.name} />
      <main className="modabella-main">
        <HeroSection
          section={hero}
          fallbackHref={heroFallbackHref}
        />
        <CategoryStrip categories={data.categories} title={categoryTitle} />
        <ProductGrid
          products={products}
          title={feed?.content.title ?? "Destaques"}
          categorySlug={firstCategorySlug}
        />
      </main>
      <footer className="modabella-footer">
        <strong>{data.settings.name}</strong>
        <span>Catálogo online</span>
      </footer>
      <BottomNavigation
        categorySlug={firstCategorySlug}
        current="home"
        whatsAppNumber={data.settings.whatsAppNumber}
        storeName={data.settings.name}
      />
    </div>
  );
}
