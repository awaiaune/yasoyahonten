CREATE TABLE IF NOT EXISTS production_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL UNIQUE, database_id TEXT NOT NULL, location_id TEXT NOT NULL);
-- Production only. New tables only. Never execute automatically. Inspect existing schema first.
CREATE TABLE mg_products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','stopped','archived')),
 version INTEGER NOT NULL, draft_revision INTEGER NOT NULL, published_revision INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE mg_revisions (
 product_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(product_id,revision)
);
CREATE TABLE mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL);
CREATE TABLE mg_images (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
 bytes INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE mg_mappings (
 variant_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 location_id TEXT NOT NULL, item_id TEXT NOT NULL, variation_id TEXT NOT NULL UNIQUE,
 item_version INTEGER NOT NULL, variation_version INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, instance_id TEXT NOT NULL, verified_at TEXT NOT NULL
);
CREATE TABLE mg_jobs (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
 payload_json TEXT NOT NULL, body_json TEXT, result_json TEXT,
 state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_due INTEGER NOT NULL,
 last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX mg_jobs_due ON mg_jobs(state,next_due);
CREATE TABLE mg_locks (variant_id TEXT PRIMARY KEY, job_id TEXT NOT NULL);
CREATE TABLE mg_inventory_operations (
 id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, kind TEXT NOT NULL, quantity INTEGER NOT NULL,
 reason TEXT NOT NULL, actor TEXT NOT NULL, before_quantity INTEGER NOT NULL,
 after_quantity INTEGER, state TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE mg_stock_snapshot (
 variant_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL, observed_at TEXT NOT NULL
);
CREATE TABLE mg_commands (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL);
CREATE TABLE mg_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT NOT NULL,
 detail_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE mg_image_mappings (
 image_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 square_image_id TEXT NOT NULL, created_at TEXT NOT NULL
);
