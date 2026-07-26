-- Vault catalog storefront marketing (FitMoms-style /programs page)
CREATE TABLE vault_catalog_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  marketing_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
