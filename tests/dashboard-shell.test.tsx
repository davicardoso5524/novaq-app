import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppShell } from "../src/components/app-shell";

describe("AppShell tenant isolation", () => {
  it("renders the active tenant and role without leaking unprovided tenants", () => {
    const html = renderToStaticMarkup(
      <AppShell
        user={{ name: "Maria", email: "maria@example.com" }}
        activeTenant={{ id: "tenant-a", name: "ModaBella", role: "OWNER" }}
        tenants={[{ id: "tenant-a", name: "ModaBella", role: "OWNER" }]}
      >
        <p>Resumo seguro</p>
      </AppShell>,
    );

    expect(html).toContain("ModaBella");
    expect(html).toContain("Proprietário");
    expect(html).toContain("Resumo seguro");
    expect(html).not.toContain("Loja B");
  });
});
