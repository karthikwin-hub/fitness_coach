import { headers } from "next/headers";
import { ProgramsCatalogView } from "@/components/vault/programs-catalog-view";
import { getVaultCatalogMarketing, listPublishedVaultCatalog } from "@/lib/vault/queries";
import { resolveTenantBySlug } from "@/lib/tenant/resolver";
import { DEFAULT_VAULT_CATALOG_MARKETING } from "@/lib/vault/types";

export default async function ProgramsPage() {
  const headerList = await headers();
  const tenantSlug =
    headerList.get("x-tenant-slug") ??
    process.env.DEFAULT_TENANT_SLUG ??
    "abstrack";

  const tenant = await resolveTenantBySlug(tenantSlug);
  const families = tenant
    ? await listPublishedVaultCatalog(tenant.tenantId)
    : [];
  const marketing = tenant
    ? await getVaultCatalogMarketing(tenant.tenantId)
    : DEFAULT_VAULT_CATALOG_MARKETING;

  return <ProgramsCatalogView families={families} marketing={marketing} />;
}
