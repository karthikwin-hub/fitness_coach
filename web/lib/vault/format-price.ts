export type PriceCurrency = "INR" | "USD";

export function formatVaultPrice(amount: number, currency: PriceCurrency): string {
  if (currency === "INR") {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `$${amount.toLocaleString("en-US")}`;
}

export function pickDisplayCurrency(preferInr: boolean): PriceCurrency {
  return preferInr ? "INR" : "USD";
}

export function productSalePrice(
  product: {
    salePriceInr: number;
    salePriceUsd: number;
    listPriceInr: number | null;
    listPriceUsd: number | null;
  },
  currency: PriceCurrency,
): { sale: number; list: number | null } {
  if (currency === "INR") {
    return { sale: product.salePriceInr, list: product.listPriceInr };
  }
  return { sale: product.salePriceUsd, list: product.listPriceUsd };
}
