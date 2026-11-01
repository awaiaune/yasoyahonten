CREATE TABLE mg_inventory_operations (
 id TEXT PRIMARY KEY, variant_id TEXT NOT NULL, kind TEXT NOT NULL, quantity INTEGER NOT NULL,
 reason TEXT NOT NULL, actor TEXT NOT NULL, before_quantity INTEGER NOT NULL,
 after_quantity INTEGER, state TEXT NOT NULL, created_at TEXT NOT NULL
);
