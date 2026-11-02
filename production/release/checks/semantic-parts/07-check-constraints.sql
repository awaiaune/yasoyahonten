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
expected_checks(table_name,expression) AS (VALUES
('mg_image_mappings','check(environment=''production'')'),
('mg_management_monitor','check(id=1)'),
('mg_mappings','check(environment=''production'')'),
('mg_products','check(statusin(''draft'',''published'',''stopped'',''archived''))'),
('production_environment','check(id=1)')),
scan(name,sql,pos,quote,compact) AS (
 SELECT t.name,s.sql,1,'','' FROM expected_tables t JOIN sqlite_schema s ON s.name=t.name AND s.type='table'
 UNION ALL
 SELECT name,sql,pos+1,
 CASE WHEN quote='' AND substr(sql,pos,1) IN (char(39),char(34),char(96),'[') THEN CASE WHEN substr(sql,pos,1)='[' THEN ']' ELSE substr(sql,pos,1) END
 WHEN quote<>'' AND substr(sql,pos,1)=quote THEN '' ELSE quote END,
 compact||CASE WHEN quote<>'' OR substr(sql,pos,1) IN (char(39),char(34),char(96),'[') THEN substr(sql,pos,1)
 WHEN substr(sql,pos,1) IN (' ',char(9),char(10),char(13)) THEN '' ELSE lower(substr(sql,pos,1)) END
 FROM scan WHERE pos<=length(sql) AND pos<=8192
),
normalized AS (SELECT name,compact FROM scan WHERE pos=length(sql)+1 AND quote='')
SELECT 'checks:'||t.name AS check_name,CASE WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=t.name AND s.type='table') THEN 'MISSING' WHEN NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name) OR EXISTS(
 SELECT 1 FROM expected_checks e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name AND instr(n.compact,e.expression)>0)) OR EXISTS(
 SELECT 1 FROM normalized n WHERE n.name=t.name AND (length(n.compact)-length(replace(n.compact,'check(','')))/6<>t.checks_count) THEN 'MISMATCH:CHECK' ELSE 'MATCH' END AS result FROM expected_tables t ORDER BY t.name;
