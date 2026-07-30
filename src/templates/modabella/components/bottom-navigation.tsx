import Link from "next/link";
import { CartIcon, GridIcon, HomeIcon, MessageIcon } from "./icons";

export type BottomNavigationState = "home" | "category" | "cart" | null;

export function BottomNavigation({
  categorySlug,
  current,
  whatsAppNumber,
  storeName,
}: {
  categorySlug?: string;
  current: BottomNavigationState;
  whatsAppNumber: string | null;
  storeName: string;
}) {
  const contactHref = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(`Olá! Vim pelo catálogo da ${storeName}.`)}`
    : null;

  return (
    <nav className="modabella-bottom-nav" aria-label="Navegação principal">
      <Link className={current === "home" ? "is-active" : undefined} href="/" aria-current={current === "home" ? "page" : undefined}><HomeIcon /><span>Home</span></Link>
      {categorySlug ? <Link className={current === "category" ? "is-active" : undefined} href={`/categorias/${categorySlug}`} aria-current={current === "category" ? "page" : undefined}><GridIcon /><span>Categorias</span></Link> : null}
      <Link className={current === "cart" ? "is-active" : undefined} href="/carrinho" aria-current={current === "cart" ? "page" : undefined}><CartIcon /><span>Carrinho</span></Link>
      {contactHref ? <Link href={contactHref} target="_blank" rel="noreferrer"><MessageIcon /><span>Contato</span></Link> : null}
    </nav>
  );
}
