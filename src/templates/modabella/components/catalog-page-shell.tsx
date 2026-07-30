import type { CSSProperties, ReactNode } from "react";
import type { PublicStoreData } from "../../../lib/catalog/types";
import { BottomNavigation } from "./bottom-navigation";
import type { BottomNavigationState } from "./bottom-navigation";
import { StoreHeader } from "./store-header";

type StoreStyle = CSSProperties & { "--store-accent": string };

export function CatalogPageShell({
  data,
  children,
  currentNavigation = null,
  hideBottomNavigation = false,
}: {
  data: PublicStoreData;
  children: ReactNode;
  currentNavigation?: BottomNavigationState;
  hideBottomNavigation?: boolean;
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
      {hideBottomNavigation ? null : (
        <BottomNavigation
          categorySlug={firstCategorySlug}
          current={currentNavigation}
          whatsAppNumber={data.settings.whatsAppNumber}
          storeName={data.settings.name}
        />
      )}
    </div>
  );
}
