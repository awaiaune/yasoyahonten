WITH expected(name,type,ddl) AS (VALUES
('production_environment','table','CREATE TABLE production_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL UNIQUE, database_id TEXT NOT NULL, location_id TEXT NOT NULL)'),
('mg_products','table','CREATE TABLE mg_products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT ''draft'' CHECK(status IN (''draft'',''published'',''stopped'',''archived'')),
 version INTEGER NOT NULL, draft_revision INTEGER NOT NULL, published_revision INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)'),
('mg_revisions','table','CREATE TABLE mg_revisions (
 product_id TEXT NOT NULL, revision INTEGER NOT NULL, data_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(product_id,revision)
)'),
('mg_variants','table','CREATE TABLE mg_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL)'),
('mg_images','table','CREATE TABLE mg_images (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
 bytes INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, created_at TEXT NOT NULL
)'),
('mg_mappings','table','CREATE TABLE mg_mappings (
 variant_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment=''production''),
 location_id TEXT NOT NULL, item_id TEXT NOT NULL, variation_id TEXT NOT NULL UNIQUE,
 item_version INTEGER NOT NULL, variation_version INTEGER NOT NULL, sku TEXT NOT NULL UNIQUE, instance_id TEXT NOT NULL, verified_at TEXT NOT NULL
)'),
('mg_jobs','table','CREATE TABLE mg_jobs (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource_id TEXT NOT NULL, fingerprint TEXT NOT NULL,
 payload_json TEXT NOT NULL, body_json TEXT, result_json TEXT,
 state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_due INTEGER NOT NULL,
 last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)'),
('mg_jobs_due','index','CREATE INDEX mg_jobs_due ON mg_jobs(state,next_due)'),
('mg_locks','table','CREATE TABLE mg_locks (variant_id TEXT PRIMARY KEY, job_id TEXT NOT NULL)'),
('mg_inventory_operations','table','CREATE TABLE mg_inventory_operations (
 id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, kind TEXT NOT NULL, quantity INTEGER NOT NULL,
 reason TEXT NOT NULL, actor TEXT NOT NULL, before_quantity INTEGER NOT NULL,
 after_quantity INTEGER, state TEXT NOT NULL, created_at TEXT NOT NULL
)'),
('mg_stock_snapshot','table','CREATE TABLE mg_stock_snapshot (
 variant_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL, observed_at TEXT NOT NULL
)'),
('mg_commands','table','CREATE TABLE mg_commands (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL)'),
('mg_audit','table','CREATE TABLE mg_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, resource_id TEXT NOT NULL,
 detail_json TEXT NOT NULL, created_at TEXT NOT NULL
)'),
('mg_image_mappings','table','CREATE TABLE mg_image_mappings (
 image_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment=''production''),
 square_image_id TEXT NOT NULL, created_at TEXT NOT NULL
)'),
('mg_job_notifications','table','CREATE TABLE mg_job_notifications (
 job_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT ''pending'', attempts INTEGER NOT NULL DEFAULT 0,
 next_due INTEGER NOT NULL, first_attempt_at INTEGER, sent_at TEXT,
 last_error TEXT, created_at TEXT NOT NULL
)'),
('mg_notification_due','index','CREATE INDEX mg_notification_due ON mg_job_notifications(state,next_due)'),
('mg_management_monitor','table','CREATE TABLE mg_management_monitor (
 id INTEGER PRIMARY KEY CHECK(id=1), last_scan_at TEXT,
 alarm_state TEXT NOT NULL DEFAULT ''unknown'', updated_at TEXT NOT NULL
)'))
SELECT 'observed_utc' AS check_name,strftime('%Y-%m-%dT%H:%M:%fZ','now') AS result
UNION ALL
SELECT 'orders_count',CAST(COUNT(*) AS TEXT) FROM orders
UNION ALL
SELECT 'schema:'||e.name,CASE WHEN s.name IS NULL THEN 'MISSING' WHEN s.type=e.type AND trim(s.sql)=e.ddl THEN 'MATCH' ELSE 'MISMATCH' END FROM expected e LEFT JOIN sqlite_schema s ON lower(s.name)=e.name
UNION ALL
SELECT 'unexpected:'||name,type FROM sqlite_schema WHERE (name GLOB 'mg_*' OR name='production_environment') AND name NOT IN (SELECT name FROM expected);
