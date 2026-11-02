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
('production_environment',4,1,1)),
actual_indexes AS (
 SELECT t.name AS table_name,i.name,CASE WHEN i.origin='c' THEN i.name ELSE '' END AS index_name,i."unique" AS is_unique,i.origin,i.partial,
 (SELECT group_concat(v,'') FROM (SELECT x.name||':'||x.coll||':'||x.desc||',' AS v FROM pragma_index_xinfo(i.name) x WHERE x.key=1 ORDER BY x.seqno)) AS raw_keys
 FROM expected_tables t JOIN pragma_index_list(t.name) i
),
index_shapes AS (SELECT *,rtrim(raw_keys,',') AS keys FROM actual_indexes)
SELECT 'index:'||name AS check_name,CASE WHEN keys='state:BINARY:0,next_due:BINARY:0' AND is_unique=0 AND partial=0 THEN 'MATCH' ELSE 'MISMATCH' END AS result FROM index_shapes WHERE name IN ('mg_jobs_due','mg_notification_due');
