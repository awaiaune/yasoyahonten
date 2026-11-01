CREATE TABLE IF NOT EXISTS production_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL UNIQUE, database_id TEXT NOT NULL, location_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mg_products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','stopped','archived')),
 version INTEGER NOT NULL, draft_revision INTEGER NOT NULL, published_revision INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_revisions (
 product_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(product_id,revision)
);
CREATE TABLE IF NOT EXISTS mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mg_images (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
 bytes INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_mappings (
 variant_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 location_id TEXT NOT NULL, item_id TEXT NOT NULL, variation_id TEXT NOT NULL UNIQUE,
 item_version INTEGER NOT NULL, variation_version INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, instance_id TEXT NOT NULL, verified_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_jobs (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
 payload_json TEXT NOT NULL, body_json TEXT, result_json TEXT,
 state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_due INTEGER NOT NULL,
 last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mg_jobs_due ON mg_jobs(state,next_due);
CREATE TABLE IF NOT EXISTS mg_locks (variant_id TEXT PRIMARY KEY, job_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mg_inventory_operations (
 id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, kind TEXT NOT NULL, quantity INTEGER NOT NULL,
 reason TEXT NOT NULL, actor TEXT NOT NULL, before_quantity INTEGER NOT NULL,
 after_quantity INTEGER, state TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_stock_snapshot (
 variant_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL, observed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_commands (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS mg_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT NOT NULL,
 detail_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_image_mappings (
 image_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 square_image_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mg_job_notifications (
 job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 next_due INTEGER NOT NULL, first_attempt_at INTEGER, sent_at TEXT,
 last_error TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS mg_notification_due ON mg_job_notifications(state,next_due);
CREATE TABLE IF NOT EXISTS mg_management_monitor (
 id INTEGER PRIMARY KEY CHECK(id=1), last_scan_at TEXT,
 alarm_state TEXT NOT NULL DEFAULT 'unknown', updated_at TEXT NOT NULL
);
INSERT INTO production_environment(id,instance_id,database_id,location_id)
SELECT 1,'0f1d8c9f-ae1b-40ef-bb42-f0b790bcd5fa','442fa9fd-25d3-4c01-bcc3-04be7b420cf5','LQ693S4H2NBZ8'
WHERE NOT EXISTS (SELECT 1 FROM production_environment WHERE id=1 AND instance_id='0f1d8c9f-ae1b-40ef-bb42-f0b790bcd5fa' AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8');
