import type { CSSProperties, ReactNode } from "react";
import { CartProvider } from "../../../components/storefront/cart-provider";
import type { PublicStoreData } from "../../../lib/catalog/types";
import { BottomNavigation } from "./bottom-navigation";
import type { BottomNavigationItem } from "./bottom-navigation";
import { StoreHeader } from "./store-header";

type StoreStyle = CSSProperties & { "--store-accent": string };

export function CatalogPageShell({
  data,
  children,
  activeItem = null,
  currentCategorySlug,
  hideBottomNavigation = false,
}: {
  data: PublicStoreData;
  children: ReactNode;
  activeItem?: BottomNavigationItem;
  currentCategorySlug?: string;
  hideBottomNavigation?: boolean;
}) {
  const style: StoreStyle = {
    "--store-accent": data.theme?.config.accentColor ?? "#6C3CE0",
  };
  const categoryDestinationSlug = currentCategorySlug ?? data.categories[0]?.slug;

  return (
    <CartProvider catalog={data}>
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
          activeItem={activeItem}
          categorySlug={categoryDestinationSlug}
          whatsAppNumber={data.settings.whatsAppNumber}
          storeName={data.settings.name}
        />
      )}
    </div>
    </CartProvider>
  );
}
