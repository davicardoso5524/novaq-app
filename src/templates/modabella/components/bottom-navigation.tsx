import Link from "next/link";
import { CartCount } from "../../../components/storefront/cart-count";
import { CartIcon, GridIcon, HomeIcon, MessageIcon } from "./icons";

export type BottomNavigationItem = "home" | "categories" | "cart" | null;

export function BottomNavigation({
  categorySlug,
  activeItem,
  whatsAppNumber,
  storeName,
}: {
  categorySlug?: string;
  activeItem: BottomNavigationItem;
  whatsAppNumber: string | null;
  storeName: string;
}) {
  const contactHref = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(`Olá! Vim pelo catálogo da ${storeName}.`)}`
    : null;

  return (
    <nav className="modabella-bottom-nav" aria-label="Navegação principal">
      <Link className={activeItem === "home" ? "is-active" : undefined} href="/" aria-current={activeItem === "home" ? "page" : undefined}><HomeIcon /><span>Home</span></Link>
      {categorySlug ? <Link className={activeItem === "categories" ? "is-active" : undefined} href={`/categorias/${categorySlug}`} aria-current={activeItem === "categories" ? "page" : undefined}><GridIcon /><span>Categorias</span></Link> : null}
      <Link className={activeItem === "cart" ? "is-active" : undefined} href="/carrinho" aria-current={activeItem === "cart" ? "page" : undefined}><CartIcon /><CartCount label /></Link>
      {contactHref ? <Link href={contactHref} target="_blank" rel="noreferrer"><MessageIcon /><span>Contato</span></Link> : null}
    </nav>
  );
}
