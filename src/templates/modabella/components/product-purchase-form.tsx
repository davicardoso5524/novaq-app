"use client";

import { useState, type FormEvent } from "react";
import { useCart } from "../../../components/storefront/cart-provider";
import type { PublicProductVariant } from "../../../lib/catalog/types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductPurchaseForm({
  productSlug,
  basePrice,
  compareAtPrice,
  variants,
}: {
  productSlug: string;
  basePrice: string;
  compareAtPrice: string | null;
  variants: PublicProductVariant[];
}) {
  const { addItem, hydrated } = useCart();
  const hasTrackedInventory = variants.length > 0;
  const availableVariants = variants.filter((variant) => variant.stock > 0);
  const [selectedSku, setSelectedSku] = useState(availableVariants[0]?.sku ?? "");
  const [feedback, setFeedback] = useState("");
  const selectedVariant =
    availableVariants.find((variant) => variant.sku === selectedSku) ??
    availableVariants[0];
  const selectedLabel = selectedVariant
    ? `${selectedVariant.size} · ${selectedVariant.color}`
    : "";
  const effectivePrice = selectedVariant?.price ?? basePrice;
  const totalStock = availableVariants.reduce(
    (total, variant) => total + variant.stock,
    0,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated) {
      setFeedback("Aguarde o carrinho carregar.");
      return;
    }
    if (hasTrackedInventory && !selectedVariant) {
      setFeedback("Escolha uma opção disponível.");
      return;
    }
    const added = addItem(productSlug, selectedVariant?.sku);
    setFeedback(
      added
        ? "Produto adicionado ao carrinho."
        : "Limite de quantidade atingido para este item.",
    );
  }

  return (
    <form className="mt-5" onSubmit={handleSubmit}>
      <input name="produto" type="hidden" value={productSlug} />
      {selectedVariant ? (
        <>
          <input name="variantLabel" type="hidden" value={selectedLabel} />
          <input name="unitPrice" type="hidden" value={effectivePrice} />
        </>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-3" aria-live="polite">
        <strong className="text-3xl text-orange-600">
          {money.format(Number(effectivePrice))}
        </strong>
        {compareAtPrice && Number(compareAtPrice) > Number(effectivePrice) ? (
          <del className="text-base text-gray-500">
            {money.format(Number(compareAtPrice))}
          </del>
        ) : null}
      </div>

      {hasTrackedInventory ? (
        <fieldset className="mt-7 border-t border-purple-100 pt-6" disabled={!availableVariants.length}>
          <legend className="font-bold text-gray-900">Escolha uma opção</legend>
          {availableVariants.length ? (
            <div className="mt-3 grid gap-2">
              {availableVariants.map((variant) => {
                const label = `${variant.size} · ${variant.color}`;
                const variantPrice = variant.price ?? basePrice;
                return (
                  <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-purple-100 px-4 py-3 text-sm text-gray-700 has-[:checked]:border-[var(--store-accent)] has-[:checked]:bg-purple-50" key={variant.sku}>
                    <span className="flex items-center gap-3">
                      <input
                        checked={selectedVariant?.sku === variant.sku}
                        name="sku"
                        onChange={() => setSelectedSku(variant.sku)}
                        required
                        type="radio"
                        value={variant.sku}
                      />
                      <span className="font-semibold">{label}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold text-gray-900">
                        {money.format(Number(variantPrice))}
                      </span>
                      <span>{variant.stock} em estoque</span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-gray-100 p-4 text-sm text-gray-600">
              Produto esgotado no momento.
            </p>
          )}
        </fieldset>
      ) : (
        <p className="mt-7 rounded-2xl border border-purple-100 bg-purple-50 p-4 text-sm leading-6 text-gray-700">
          Estoque não rastreado. A disponibilidade será confirmada pela loja; limite de 99 unidades por orçamento.
        </p>
      )}
      {hasTrackedInventory ? <p className="mt-4 text-sm text-gray-600">
        {totalStock} {totalStock === 1 ? "unidade disponível" : "unidades disponíveis"}
      </p> : null}
      <button
        className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--store-accent)] px-5 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        disabled={!hydrated || (hasTrackedInventory && !availableVariants.length)}
        type="submit"
      >
        Adicionar ao carrinho
      </button>
      <p className="mt-3 min-h-5 text-center text-sm font-semibold text-[var(--store-accent)]" aria-live="polite">
        {feedback || (!hydrated ? "Preparando carrinho…" : "")}
      </p>
    </form>
  );
}
