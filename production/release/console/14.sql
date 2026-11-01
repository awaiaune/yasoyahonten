CREATE TABLE mg_image_mappings (
 image_id TEXT PRIMARY KEY, environment TEXT NOT NULL CHECK(environment='production'),
 square_image_id TEXT NOT NULL, created_at TEXT NOT NULL
);
