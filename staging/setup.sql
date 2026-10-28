-- Execute ONCE only in yasoya-v53-staging-orders (d16c9e56-076a-4470-8d78-4fcfbe32b4dd).
-- Stop on errors. Never execute against yasoya-orders. No production or Square data.

CREATE TABLE IF NOT EXISTS orders (
        order_reference TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        subtotal INTEGER NOT NULL,
        shipping INTEGER NOT NULL,
        total INTEGER NOT NULL,
        items_json TEXT NOT NULL,
        contact_json TEXT NOT NULL,
        inventory_adjusted INTEGER NOT NULL DEFAULT 0,
        shipping_method TEXT,
        tracking_number TEXT,
        shipped_at TEXT
    );
CREATE TABLE staging_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL UNIQUE, database_id TEXT NOT NULL);

-- Additive only. Apply to the isolated validation DB after separate approval.
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
 variant_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='sandbox'),
 location_id TEXT NOT NULL, item_id TEXT NOT NULL, variation_id TEXT NOT NULL UNIQUE,
 item_version INTEGER NOT NULL, variation_version INTEGER NOT NULL
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
 image_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='sandbox'),
 square_image_id TEXT NOT NULL, created_at TEXT NOT NULL
);

-- Additive management supervision only; preserve orders, job IDs and mappings.
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

-- Run once, only on yasoya-v53-staging-orders AFTER staging migrations.
INSERT INTO staging_environment VALUES(1,'853e7e9a-fbf1-4d88-94b6-16506a9f09a3','d16c9e56-076a-4470-8d78-4fcfbe32b4dd');

SELECT instance_id,database_id FROM staging_environment WHERE id=1;
SELECT COUNT(*) AS staging_products FROM mg_products;
SELECT COUNT(*) AS staging_orders FROM orders;
