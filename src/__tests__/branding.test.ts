import { describe, expect, it } from "vitest";
import { platformName } from "../lib/branding";

describe("branding", () => {
  it("exposes the multitenant platform name", () => {
    expect(platformName).toBe("Novaq Multi-tenant");
  });
});
