"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildWhatsAppQuote } from "../../lib/catalog/whatsapp";
import { useCart } from "./cart-provider";

function formatCents(value: number): string {
  const reais = Math.floor(value / 100).toLocaleString("pt-BR");
  return `R$ ${reais},${String(value % 100).padStart(2, "0")}`;
}

export function CartPageContent({
  storeName,
  whatsAppNumber,
  publicUrl,
}: {
  storeName: string;
  whatsAppNumber: string | null;
  publicUrl: string;
}) {
  const { hydrated, items, totalItems, totalPrice, setQuantity, removeItem, clearCart } = useCart();

  const quote = useMemo(() => {
    if (!items.length || !whatsAppNumber) return null;
    try {
      return buildWhatsAppQuote({
        phone: whatsAppNumber,
        storeName,
        publicUrl,
        items: items.map(({ name, variantLabel, quantity, unitPrice }) => ({
          name,
          variantLabel,
          quantity,
          unitPrice,
        })),
      });
    } catch {
      return null;
    }
  }, [items, publicUrl, storeName, whatsAppNumber]);

  if (!hydrated) {
    return (
      <p className="modabella-section py-16 text-center text-sm font-semibold text-gray-600" role="status">
        Carregando carrinho…
      </p>
    );
  }

  if (!items.length) {
    return (
      <section className="modabella-section py-16 text-center" aria-labelledby="cart-title">
        <div className="mx-auto max-w-lg rounded-3xl border border-purple-100 bg-white p-8 shadow-sm">
          <p className="text-4xl" aria-hidden="true">🛍️</p>
          <h1 id="cart-title" className="mt-4 text-2xl font-extrabold text-gray-900">
            Seu carrinho está vazio
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Escolha seus produtos favoritos e volte aqui para pedir um orçamento.
          </p>
          <Link className="modabella-button mt-6 bg-[var(--store-accent)] text-white" href="/">
            Ver produtos
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="modabella-section pb-12" aria-labelledby="cart-title">
      <div className="modabella-section__heading">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--store-accent)]">
            {totalItems} {totalItems === 1 ? "item" : "itens"}
          </p>
          <h1 id="cart-title">Seu carrinho</h1>
        </div>
        <button className="min-h-11 rounded-xl px-3 text-sm font-bold text-gray-600 hover:bg-purple-50" onClick={clearCart} type="button">
          Limpar
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ul className="grid gap-3" aria-label="Produtos no carrinho">
          {items.map((item) => (
            <li className="rounded-3xl border border-purple-100 bg-white p-4 shadow-sm sm:p-5" key={`${item.slug}:${item.variantId ?? ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link className="font-extrabold text-gray-900 hover:text-[var(--store-accent)]" href={`/produto/${item.slug}`}>
                    {item.name}
                  </Link>
                  {item.variantLabel ? <p className="mt-1 text-sm text-gray-600">{item.variantLabel}</p> : null}
                  <p className="mt-2 font-bold text-orange-600">{formatCents(item.unitPrice)}</p>
                </div>
                <button className="min-h-11 rounded-xl px-3 text-sm font-bold text-gray-600 hover:bg-purple-50" onClick={() => removeItem(item.slug, item.variantId)} type="button">
                  Remover <span className="sr-only">{item.name}</span>
                </button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-purple-100 pt-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                  Quantidade
                  <input
                    aria-label={`Quantidade de ${item.name}${item.variantLabel ? `, ${item.variantLabel}` : ""}`}
                    className="h-11 w-20 rounded-xl border border-purple-200 bg-white px-3 text-center text-gray-900"
                    max={item.maxQuantity}
                    min={1}
                    onChange={(event) => setQuantity(item.slug, item.variantId, Number(event.target.value))}
                    type="number"
                    value={item.quantity}
                  />
                </label>
                <strong className="text-gray-900">{formatCents(item.unitPrice * item.quantity)}</strong>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-28" aria-label="Resumo do orçamento">
          <h2 className="text-xl font-extrabold text-gray-900">Resumo</h2>
          <div className="mt-5 flex items-center justify-between border-y border-purple-100 py-4">
            <span className="text-gray-600">Total estimado</span>
            <strong className="text-xl text-gray-900">{formatCents(totalPrice)}</strong>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            O valor e a disponibilidade serão confirmados pela loja no atendimento.
          </p>
          {quote ? (
            <a className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#157347] px-5 text-center font-bold text-white" href={quote.url} rel="noreferrer" target="_blank">
              Pedir orçamento no WhatsApp
            </a>
          ) : (
            <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
              O orçamento pelo WhatsApp não está disponível agora. Entre em contato com a loja por outro canal.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
