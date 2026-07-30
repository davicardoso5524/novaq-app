import type { ReactNode } from "react";
import { platformName } from "@/lib/branding";
import { CartProvider } from "@/components/storefront/cart-provider";
import "./globals.css";

export const metadata = {
  title: platformName,
  description: "Scaffold inicial da plataforma multi-tenant da Novaq."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased"><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
