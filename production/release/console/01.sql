CREATE TABLE IF NOT EXISTS production_environment (id INTEGER PRIMARY KEY CHECK(id=1), instance_id TEXT NOT NULL UNIQUE, database_id TEXT NOT NULL, location_id TEXT NOT NULL);
