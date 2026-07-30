"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicProduct, PublicStoreData } from "../../lib/catalog/types";
import { moneyToCents } from "../../lib/catalog/whatsapp";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  variantId?: string;
  variantLabel?: string;
};

type CartStorage = Pick<Storage, "getItem">;
type PersistedCart = {
  version: 1;
  items: Array<{ slug: string; variantId?: string; quantity: number }>;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (slug: string, variantId?: string, quantity?: number) => boolean;
  setQuantity: (slug: string, variantId: string | undefined, quantity: number) => void;
  removeItem: (slug: string, variantId?: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function cartStorageKey(tenantSlug: string): string {
  return `novaq:cart:${tenantSlug}:v1`;
}

function sameIdentity(
  item: Pick<CartItem, "slug" | "variantId">,
  slug: string,
  variantId?: string,
): boolean {
  return item.slug === slug && item.variantId === variantId;
}

function resolveCurrentItem(
  products: PublicProduct[],
  slug: string,
  variantId: string | undefined,
  quantity: number,
): CartItem | null {
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product || !variantId) return null;

  const variant = product.variants.find(
    (candidate) => candidate.sku === variantId && candidate.stock > 0,
  );
  if (!variant) return null;

  return {
    productId: product.slug,
    slug: product.slug,
    name: product.name,
    unitPrice: moneyToCents(variant.price ?? product.price),
    quantity: Math.min(Math.max(1, quantity), variant.stock),
    maxQuantity: variant.stock,
    variantId: variant.sku,
    variantLabel: `${variant.size} · ${variant.color}`,
  };
}

function isPersistedCart(value: unknown): value is PersistedCart {
  if (!value || typeof value !== "object") return false;
  const cart = value as Partial<PersistedCart>;
  return cart.version === 1 && Array.isArray(cart.items) && cart.items.every((item) =>
    Boolean(
      item &&
        typeof item.slug === "string" &&
        item.slug.length > 0 &&
        (item.variantId === undefined || typeof item.variantId === "string") &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity >= 1,
    ),
  );
}

export function loadCartFromStorage(
  storage: CartStorage,
  tenantSlug: string,
  products: PublicProduct[],
): CartItem[] {
  try {
    const raw = storage.getItem(cartStorageKey(tenantSlug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedCart(parsed)) return [];

    return parsed.items.reduce<CartItem[]>((current, item) =>
      addOrIncrementCartItem(
        current,
        products,
        item.slug,
        item.variantId,
        item.quantity,
      ), []);
  } catch {
    return [];
  }
}

export function addOrIncrementCartItem(
  items: CartItem[],
  products: PublicProduct[],
  slug: string,
  variantId: string | undefined,
  quantity = 1,
): CartItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items;
  const incoming = resolveCurrentItem(products, slug, variantId, quantity);
  if (!incoming) return items;

  const existing = items.find((item) => sameIdentity(item, slug, variantId));
  if (!existing) return [...items, incoming];

  return items.map((item) =>
    sameIdentity(item, slug, variantId)
      ? { ...incoming, quantity: Math.min(item.quantity + quantity, incoming.maxQuantity) }
      : item,
  );
}

export function CartProvider({
  catalog,
  children,
}: {
  catalog: PublicStoreData;
  children?: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setItems(loadCartFromStorage(window.localStorage, catalog.tenant.slug, catalog.products));
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [catalog.products, catalog.tenant.slug]);

  useEffect(() => {
    if (!hydrated) return;
    const persisted: PersistedCart = {
      version: 1,
      items: items.map(({ slug, variantId, quantity }) => ({ slug, variantId, quantity })),
    };
    try {
      window.localStorage.setItem(cartStorageKey(catalog.tenant.slug), JSON.stringify(persisted));
    } catch {
      // The cart remains usable in memory when storage is unavailable or full.
    }
  }, [catalog.tenant.slug, hydrated, items]);

  const addItem = useCallback(
    (slug: string, variantId?: string, quantity = 1) => {
      const valid = resolveCurrentItem(catalog.products, slug, variantId, quantity);
      if (!valid) return false;
      setItems((current) =>
        addOrIncrementCartItem(current, catalog.products, slug, variantId, quantity),
      );
      return true;
    },
    [catalog.products],
  );

  const setQuantity = useCallback(
    (slug: string, variantId: string | undefined, quantity: number) => {
      if (!Number.isSafeInteger(quantity)) return;
      if (quantity < 1) {
        setItems((current) => current.filter((item) => !sameIdentity(item, slug, variantId)));
        return;
      }
      setItems((current) => current.map((item) =>
        sameIdentity(item, slug, variantId)
          ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
          : item,
      ));
    },
    [],
  );

  const removeItem = useCallback((slug: string, variantId?: string) => {
    setItems((current) => current.filter((item) => !sameIdentity(item, slug, variantId)));
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    totalPrice: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart: () => setItems([]),
  }), [addItem, hydrated, items, removeItem, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart deve ser usado dentro de CartProvider");
  return context;
}

export function useCartSummary(): Pick<CartContextValue, "totalItems"> {
  const context = useContext(CartContext);
  return { totalItems: context?.totalItems ?? 0 };
}
