WITH RECURSIVE
expected_tables(name,columns_count,indexes_count,checks_count) AS (VALUES
('mg_audit',6,1,0),
('mg_commands',3,1,0),
('mg_image_mappings',4,1,1),
('mg_images',7,2,0),
('mg_inventory_operations',10,1,0),
('mg_job_notifications',9,2,0),
('mg_jobs',13,2,0),
('mg_locks',2,1,0),
('mg_management_monitor',4,0,1),
('mg_mappings',10,3,1),
('mg_products',9,2,1),
('mg_revisions',4,1,0),
('mg_stock_snapshot',3,1,0),
('mg_variants',2,1,0),
('production_environment',4,1,1))
SELECT 'unexpected:'||name AS check_name,type AS result FROM sqlite_schema WHERE (name GLOB 'mg_*' OR name='production_environment') AND name NOT IN (SELECT name FROM expected_tables) AND name NOT IN ('mg_jobs_due','mg_notification_due');
