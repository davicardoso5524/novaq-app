"use client";

import { useCartSummary } from "./cart-provider";

export function CartCount({ label = false }: { label?: boolean }) {
  const { totalItems } = useCartSummary();

  if (label) return <span>Carrinho{totalItems ? ` (${totalItems})` : ""}</span>;
  if (!totalItems) return null;

  return (
    <span className="modabella-cart-count" aria-live="polite">
      <span className="sr-only">Itens no carrinho: </span>
      {totalItems > 99 ? "99+" : totalItems}
    </span>
  );
}
