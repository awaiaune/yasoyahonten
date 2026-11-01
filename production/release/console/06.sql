CREATE TABLE mg_mappings (
 variant_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 location_id TEXT NOT NULL, item_id TEXT NOT NULL, variation_id TEXT NOT NULL UNIQUE,
 item_version INTEGER NOT NULL, variation_version INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, instance_id TEXT NOT NULL, verified_at TEXT NOT NULL
);
