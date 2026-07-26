import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { VaultProductDetailView } from "@/components/vault/vault-product-detail-view";
import { getPublishedVaultFamilyBySlug } from "@/lib/vault/queries";
import { resolveTenantBySlug } from "@/lib/tenant/resolver";

type PageProps = { params: Promise<{ slug: string }> };

export default async function VaultProductPage({ params }: PageProps) {
  const { slug } = await params;
  const headerList = await headers();
  const tenantSlug =
    headerList.get("x-tenant-slug") ??
    process.env.DEFAULT_TENANT_SLUG ??
    "abstrack";

  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const family = await getPublishedVaultFamilyBySlug(tenant.tenantId, slug);
  if (!family) notFound();

  return <VaultProductDetailView family={family} />;
}
