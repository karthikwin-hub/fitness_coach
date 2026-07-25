/** Dev persona login + tokens — local development or explicit E2E test builds only. */
export function isDevAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_E2E_DEV_AUTH === "1"
  );
}

/** Server-side dev token acceptance (runtime env, not baked into client bundle). */
export function isServerDevAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" || process.env.E2E_DEV_AUTH === "1";
}
