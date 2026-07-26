import { describe, expect, it } from "vitest";
import {
  formatVaultPrice,
  pickDisplayCurrency,
  productSalePrice,
} from "@/lib/vault/format-price";

describe("formatVaultPrice", () => {
  it("formats INR with rupee symbol", () => {
    expect(formatVaultPrice(3000, "INR")).toBe("₹3,000");
  });

  it("formats USD with dollar prefix", () => {
    expect(formatVaultPrice(50, "USD")).toBe("$50");
  });
});

describe("pickDisplayCurrency", () => {
  it("prefers INR when requested", () => {
    expect(pickDisplayCurrency(true)).toBe("INR");
    expect(pickDisplayCurrency(false)).toBe("USD");
  });
});

describe("productSalePrice", () => {
  const product = {
    salePriceInr: 3000,
    salePriceUsd: 50,
    listPriceInr: 4500,
    listPriceUsd: 75,
  };

  it("returns INR prices", () => {
    expect(productSalePrice(product, "INR")).toEqual({
      sale: 3000,
      list: 4500,
    });
  });

  it("returns USD prices", () => {
    expect(productSalePrice(product, "USD")).toEqual({
      sale: 50,
      list: 75,
    });
  });
});
