import type { CSSProperties, ReactNode } from "react";
import type { PublicStoreData } from "../../../lib/catalog/types";
import { BottomNavigation } from "./bottom-navigation";
import { StoreHeader } from "./store-header";

type StoreStyle = CSSProperties & { "--store-accent": string };

export function CatalogPageShell({
  data,
  children,
}: {
  data: PublicStoreData;
  children: ReactNode;
}) {
  const style: StoreStyle = {
    "--store-accent": data.theme?.config.accentColor ?? "#6C3CE0",
  };
  const firstCategorySlug = data.categories[0]?.slug;

  return (
    <div className="modabella-store" style={style}>
      {data.settings.texts.announcement ? (
        <p className="modabella-announcement">
          {data.settings.texts.announcement}
        </p>
      ) : null}
      <StoreHeader name={data.settings.name} />
      <main className="modabella-main">{children}</main>
      <footer className="modabella-footer">
        <strong>{data.settings.name}</strong>
        <span>Catálogo online</span>
      </footer>
      <BottomNavigation
        categorySlug={firstCategorySlug}
        whatsAppNumber={data.settings.whatsAppNumber}
        storeName={data.settings.name}
      />
    </div>
  );
}
