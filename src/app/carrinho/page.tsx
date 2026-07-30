import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CartPageContent } from "@/components/storefront/cart-page-content";
import { loadPublicStore } from "@/lib/catalog/load-public-store";
import { isAvailableStoreTemplate } from "@/lib/templates/registry";
import { CatalogPageShell } from "@/templates/modabella/components/catalog-page-shell";

export default async function CartPage() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" ? "http" : "https";
  const data = await loadPublicStore(host);
  if (!data?.theme || !isAvailableStoreTemplate(data, "MODABELLA")) notFound();

  return (
    <CatalogPageShell activeItem="cart" data={data}>
      <CartPageContent
        publicUrl={`${protocol}://${host}/carrinho`}
        storeName={data.settings.name}
        whatsAppNumber={data.settings.whatsAppNumber}
      />
    </CatalogPageShell>
  );
}
