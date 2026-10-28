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
