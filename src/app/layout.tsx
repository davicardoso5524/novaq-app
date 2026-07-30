import type { ReactNode } from "react";
import { platformName } from "@/lib/branding";
import "./globals.css";

export const metadata = {
  title: platformName,
  description: "Scaffold inicial da plataforma multi-tenant da Novaq."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-scroll-behavior="smooth" lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
