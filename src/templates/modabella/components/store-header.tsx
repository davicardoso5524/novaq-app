import Link from "next/link";
import { CartCount } from "../../../components/storefront/cart-count";
import { CartIcon, SearchIcon } from "./icons";

export function StoreHeader({ name }: { name: string }) {
  return (
    <header className="modabella-header">
      <div className="modabella-header__row">
        <Link className="modabella-logo" href="/" aria-label={`${name}, página inicial`}>
          {name}
        </Link>
        <nav className="modabella-header__actions" aria-label="Ações da loja">
          <Link className="modabella-icon-button" href="/busca" aria-label="Buscar produtos">
            <SearchIcon />
          </Link>
          <Link className="modabella-icon-button modabella-cart-link" href="/carrinho" aria-label="Abrir carrinho">
            <CartIcon />
            <CartCount />
          </Link>
        </nav>
      </div>
      <form className="modabella-search" action="/busca" role="search">
        <SearchIcon />
        <label className="sr-only" htmlFor="modabella-search">Buscar produtos</label>
        <input id="modabella-search" name="q" type="search" placeholder="Buscar produtos..." />
      </form>
    </header>
  );
}
