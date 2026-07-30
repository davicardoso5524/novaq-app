import Link from "next/link";
import { CartIcon, GridIcon, HomeIcon, MessageIcon } from "./icons";

export function BottomNavigation({ whatsAppNumber, storeName }: { whatsAppNumber: string | null; storeName: string }) {
  const contactHref = whatsAppNumber
    ? `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(`Olá! Vim pelo catálogo da ${storeName}.`)}`
    : null;

  return (
    <nav className="modabella-bottom-nav" aria-label="Navegação principal">
      <Link className="is-active" href="/"><HomeIcon /><span>Home</span></Link>
      <Link href="/categorias"><GridIcon /><span>Categorias</span></Link>
      <Link href="/carrinho"><CartIcon /><span>Carrinho</span></Link>
      {contactHref ? <Link href={contactHref} target="_blank" rel="noreferrer"><MessageIcon /><span>Contato</span></Link> : null}
    </nav>
  );
}
