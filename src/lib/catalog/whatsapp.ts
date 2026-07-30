export type WhatsAppQuoteItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  variantLabel?: string;
};

export type WhatsAppQuoteInput = {
  phone: string;
  storeName: string;
  publicUrl: string;
  items: WhatsAppQuoteItem[];
};

export class EmptyWhatsAppQuoteError extends Error {
  constructor() {
    super("O carrinho está vazio");
    this.name = "EmptyWhatsAppQuoteError";
  }
}

export function moneyToCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Valor monetário inválido");

  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Valor monetário inválido");
  return cents;
}

export function normalizeBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11
    ? `55${digits}`
    : digits;
  if (!/^55[1-9]\d(?:[2-8]\d{7}|9\d{8})$/.test(normalized)) {
    throw new Error("Telefone brasileiro inválido");
  }
  return normalized;
}

function formatCents(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Valor monetário inválido");
  }
  const reais = Math.floor(value / 100).toLocaleString("pt-BR");
  return `R$ ${reais},${String(value % 100).padStart(2, "0")}`;
}

export function buildWhatsAppQuote(
  input: WhatsAppQuoteInput,
): { message: string; url: string } {
  if (!input.items.length) throw new EmptyWhatsAppQuoteError();

  let total = 0;
  const itemBlocks = input.items.map((item, index) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Quantidade inválida");
    }
    if (!Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new Error("Valor monetário inválido");
    }

    const subtotal = item.unitPrice * item.quantity;
    if (!Number.isSafeInteger(subtotal)) throw new Error("Valor monetário inválido");
    total += subtotal;
    if (!Number.isSafeInteger(total)) throw new Error("Valor monetário inválido");

    const variant = item.variantLabel ? ` — ${item.variantLabel}` : "";
    return `${index + 1}. ${item.name}${variant}\n${item.quantity} × ${formatCents(item.unitPrice)} = ${formatCents(subtotal)}`;
  });

  const message = [
    `Olá! Gostaria de solicitar um orçamento na ${input.storeName}.`,
    ...itemBlocks,
    `Total: ${formatCents(total)}\nCatálogo: ${input.publicUrl}`,
  ].join("\n\n");
  const phone = normalizeBrazilianPhone(input.phone);

  return {
    message,
    url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
  };
}
