import { describe, expect, it } from "vitest";
import { getSeedPasswords } from "../lib/seed-config";

describe("getSeedPasswords", () => {
  it("uses explicit development seed passwords", () => {
    expect(
      getSeedPasswords({
        SEED_SUPERADMIN_PASSWORD: "super-secret",
        SEED_OWNER_PASSWORD: "owner-secret",
      }),
    ).toEqual({
      superadmin: "super-secret",
      owner: "owner-secret",
    });
  });

  it("falls back to documented local-only values", () => {
    expect(getSeedPasswords({})).toEqual({
      superadmin: "admin123456",
      owner: "owner123456",
    });
  });
});
