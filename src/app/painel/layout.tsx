import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.ativo) redirect("/login");
  return children;
}
