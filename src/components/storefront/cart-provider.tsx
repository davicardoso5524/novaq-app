"use client";

import { createContext, useContext, type ReactNode } from "react";

type CartSummary = { totalItems: number };

const CartContext = createContext<CartSummary>({ totalItems: 0 });

export function CartProvider({ children }: { children: ReactNode }) {
  return <CartContext.Provider value={{ totalItems: 0 }}>{children}</CartContext.Provider>;
}

export function useCartSummary(): CartSummary {
  return useContext(CartContext);
}
