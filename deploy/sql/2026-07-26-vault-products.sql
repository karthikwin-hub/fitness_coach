-- Vault product catalog (Phase 1 — no checkout)
CREATE TYPE vault_product_item_type AS ENUM (
  'video',
  'content_block',
  'nutrition_note',
  'shopping_list',
  'external_link'
);

CREATE TABLE vault_product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  hero_json JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE vault_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES vault_product_families(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  validity_days INTEGER NOT NULL,
  list_price_inr INTEGER,
  sale_price_inr INTEGER NOT NULL,
  list_price_usd INTEGER,
  sale_price_usd INTEGER NOT NULL,
  includes_json JSONB NOT NULL DEFAULT '[]',
  badge TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, slug)
);

CREATE TABLE vault_product_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES vault_products(id) ON DELETE CASCADE,
  item_type vault_product_item_type NOT NULL,
  ref_id UUID,
  title TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX vault_product_families_tenant_idx ON vault_product_families(tenant_id);
CREATE INDEX vault_products_family_idx ON vault_products(family_id);
CREATE INDEX vault_product_items_product_idx ON vault_product_items(product_id);
