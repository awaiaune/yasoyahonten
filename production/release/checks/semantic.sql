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
expected_columns(table_name,cid,name,type,required,default_value,pk,hidden) AS (VALUES
('mg_audit',0,'id','TEXT',0,NULL,1,0),
('mg_audit',1,'actor','TEXT',1,NULL,0,0),
('mg_audit',2,'action','TEXT',1,NULL,0,0),
('mg_audit',3,'resource_id','TEXT',1,NULL,0,0),
('mg_audit',4,'detail_json','TEXT',1,NULL,0,0),
('mg_audit',5,'created_at','TEXT',1,NULL,0,0),
('mg_commands',0,'id','TEXT',0,NULL,1,0),
('mg_commands',1,'fingerprint','TEXT',1,NULL,0,0),
('mg_commands',2,'result_json','TEXT',1,NULL,0,0),
('mg_image_mappings',0,'image_id','TEXT',0,NULL,1,0),
('mg_image_mappings',1,'environment','TEXT',1,NULL,0,0),
('mg_image_mappings',2,'square_image_id','TEXT',1,NULL,0,0),
('mg_image_mappings',3,'created_at','TEXT',1,NULL,0,0),
('mg_images',0,'id','TEXT',0,NULL,1,0),
('mg_images',1,'object_key','TEXT',1,NULL,0,0),
('mg_images',2,'mime','TEXT',1,NULL,0,0),
('mg_images',3,'bytes','INTEGER',1,NULL,0,0),
('mg_images',4,'width','INTEGER',1,NULL,0,0),
('mg_images',5,'height','INTEGER',1,NULL,0,0),
('mg_images',6,'created_at','TEXT',1,NULL,0,0),
('mg_inventory_operations',0,'id','TEXT',0,NULL,1,0),
('mg_inventory_operations',1,'variant_id','TEXT',1,NULL,0,0),
('mg_inventory_operations',2,'kind','TEXT',1,NULL,0,0),
('mg_inventory_operations',3,'quantity','INTEGER',1,NULL,0,0),
('mg_inventory_operations',4,'reason','TEXT',1,NULL,0,0),
('mg_inventory_operations',5,'actor','TEXT',1,NULL,0,0),
('mg_inventory_operations',6,'before_quantity','INTEGER',1,NULL,0,0),
('mg_inventory_operations',7,'after_quantity','INTEGER',0,NULL,0,0),
('mg_inventory_operations',8,'state','TEXT',1,NULL,0,0),
('mg_inventory_operations',9,'created_at','TEXT',1,NULL,0,0),
('mg_job_notifications',0,'job_id','TEXT',0,NULL,1,0),
('mg_job_notifications',1,'payload_json','TEXT',1,NULL,0,0),
('mg_job_notifications',2,'state','TEXT',1,'''pending''',0,0),
('mg_job_notifications',3,'attempts','INTEGER',1,'0',0,0),
('mg_job_notifications',4,'next_due','INTEGER',1,NULL,0,0),
('mg_job_notifications',5,'first_attempt_at','INTEGER',0,NULL,0,0),
('mg_job_notifications',6,'sent_at','TEXT',0,NULL,0,0),
('mg_job_notifications',7,'last_error','TEXT',0,NULL,0,0),
('mg_job_notifications',8,'created_at','TEXT',1,NULL,0,0),
('mg_jobs',0,'id','TEXT',0,NULL,1,0),
('mg_jobs',1,'kind','TEXT',1,NULL,0,0),
('mg_jobs',2,'resource_id','TEXT',1,NULL,0,0),
('mg_jobs',3,'fingerprint','TEXT',1,NULL,0,0),
('mg_jobs',4,'payload_json','TEXT',1,NULL,0,0),
('mg_jobs',5,'body_json','TEXT',0,NULL,0,0),
('mg_jobs',6,'result_json','TEXT',0,NULL,0,0),
('mg_jobs',7,'state','TEXT',1,NULL,0,0),
('mg_jobs',8,'attempts','INTEGER',1,'0',0,0),
('mg_jobs',9,'next_due','INTEGER',1,NULL,0,0),
('mg_jobs',10,'last_error','TEXT',0,NULL,0,0),
('mg_jobs',11,'created_at','TEXT',1,NULL,0,0),
('mg_jobs',12,'updated_at','TEXT',1,NULL,0,0),
('mg_locks',0,'variant_id','TEXT',0,NULL,1,0),
('mg_locks',1,'job_id','TEXT',1,NULL,0,0),
('mg_management_monitor',0,'id','INTEGER',0,NULL,1,0),
('mg_management_monitor',1,'last_scan_at','TEXT',0,NULL,0,0),
('mg_management_monitor',2,'alarm_state','TEXT',1,'''unknown''',0,0),
('mg_management_monitor',3,'updated_at','TEXT',1,NULL,0,0),
('mg_mappings',0,'variant_id','TEXT',0,NULL,1,0),
('mg_mappings',1,'environment','TEXT',1,NULL,0,0),
('mg_mappings',2,'location_id','TEXT',1,NULL,0,0),
('mg_mappings',3,'item_id','TEXT',1,NULL,0,0),
('mg_mappings',4,'variation_id','TEXT',1,NULL,0,0),
('mg_mappings',5,'item_version','INTEGER',1,NULL,0,0),
('mg_mappings',6,'variation_version','INTEGER',1,NULL,0,0),
('mg_mappings',7,'sku','TEXT',1,NULL,0,0),
('mg_mappings',8,'instance_id','TEXT',1,NULL,0,0),
('mg_mappings',9,'verified_at','TEXT',1,NULL,0,0),
('mg_products',0,'id','TEXT',0,NULL,1,0),
('mg_products',1,'slug','TEXT',1,NULL,0,0),
('mg_products',2,'sort_order','INTEGER',1,'0',0,0),
('mg_products',3,'status','TEXT',1,'''draft''',0,0),
('mg_products',4,'version','INTEGER',1,NULL,0,0),
('mg_products',5,'draft_revision','INTEGER',1,NULL,0,0),
('mg_products',6,'published_revision','INTEGER',0,NULL,0,0),
('mg_products',7,'created_at','TEXT',1,NULL,0,0),
('mg_products',8,'updated_at','TEXT',1,NULL,0,0),
('mg_revisions',0,'product_id','TEXT',1,NULL,1,0),
('mg_revisions',1,'revision','INTEGER',1,NULL,2,0),
('mg_revisions',2,'data_json','TEXT',1,NULL,0,0),
('mg_revisions',3,'created_at','TEXT',1,NULL,0,0),
('mg_stock_snapshot',0,'variant_id','TEXT',0,NULL,1,0),
('mg_stock_snapshot',1,'quantity','INTEGER',1,NULL,0,0),
('mg_stock_snapshot',2,'observed_at','TEXT',1,NULL,0,0),
('mg_variants',0,'id','TEXT',0,NULL,1,0),
('mg_variants',1,'product_id','TEXT',1,NULL,0,0),
('production_environment',0,'id','INTEGER',0,NULL,1,0),
('production_environment',1,'instance_id','TEXT',1,NULL,0,0),
('production_environment',2,'database_id','TEXT',1,NULL,0,0),
('production_environment',3,'location_id','TEXT',1,NULL,0,0)),
expected_indexes(table_name,index_name,is_unique,origin,partial,keys) AS (VALUES
('mg_audit','',1,'pk',0,'id:BINARY:0'),
('mg_commands','',1,'pk',0,'id:BINARY:0'),
('mg_image_mappings','',1,'pk',0,'image_id:BINARY:0'),
('mg_images','',1,'u',0,'object_key:BINARY:0'),
('mg_images','',1,'pk',0,'id:BINARY:0'),
('mg_inventory_operations','',1,'pk',0,'id:BINARY:0'),
('mg_job_notifications','mg_notification_due',0,'c',0,'state:BINARY:0,next_due:BINARY:0'),
('mg_job_notifications','',1,'pk',0,'job_id:BINARY:0'),
('mg_jobs','mg_jobs_due',0,'c',0,'state:BINARY:0,next_due:BINARY:0'),
('mg_jobs','',1,'pk',0,'id:BINARY:0'),
('mg_locks','',1,'pk',0,'variant_id:BINARY:0'),
('mg_mappings','',1,'u',0,'sku:BINARY:0'),
('mg_mappings','',1,'u',0,'variation_id:BINARY:0'),
('mg_mappings','',1,'pk',0,'variant_id:BINARY:0'),
('mg_products','',1,'u',0,'slug:BINARY:0'),
('mg_products','',1,'pk',0,'id:BINARY:0'),
('mg_revisions','',1,'pk',0,'product_id:BINARY:0,revision:BINARY:0'),
('mg_stock_snapshot','',1,'pk',0,'variant_id:BINARY:0'),
('mg_variants','',1,'pk',0,'id:BINARY:0'),
('production_environment','',1,'u',0,'instance_id:BINARY:0')),
expected_checks(table_name,expression) AS (VALUES
('mg_image_mappings','check(environment=''production'')'),
('mg_management_monitor','check(id=1)'),
('mg_mappings','check(environment=''production'')'),
('mg_products','check(statusin(''draft'',''published'',''stopped'',''archived''))'),
('production_environment','check(id=1)')),
actual_columns AS (
 SELECT t.name AS table_name,p.cid,p.name,upper(trim(p.type)) AS type,p."notnull" AS required,p.dflt_value AS default_value,p.pk,p.hidden
 FROM expected_tables t JOIN pragma_table_xinfo(t.name) p
),
actual_indexes AS (
 SELECT t.name AS table_name,i.name,CASE WHEN i.origin='c' THEN i.name ELSE '' END AS index_name,i."unique" AS is_unique,i.origin,i.partial,
 (SELECT group_concat(v,'') FROM (SELECT x.name||':'||x.coll||':'||x.desc||',' AS v FROM pragma_index_xinfo(i.name) x WHERE x.key=1 ORDER BY x.seqno)) AS raw_keys
 FROM expected_tables t JOIN pragma_index_list(t.name) i
),
index_shapes AS (SELECT *,rtrim(raw_keys,',') AS keys FROM actual_indexes),
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
normalized AS (SELECT name,compact FROM scan WHERE pos=length(sql)+1 AND quote=''),
table_results AS (
 SELECT t.name,CASE
 WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=t.name AND s.type='table') THEN 'MISSING'
 WHEN (SELECT COUNT(*) FROM actual_columns a WHERE a.table_name=t.name)<>t.columns_count OR EXISTS(
 SELECT 1 FROM expected_columns e LEFT JOIN actual_columns a ON a.table_name=e.table_name AND a.cid=e.cid
 WHERE e.table_name=t.name AND (a.name IS NULL OR a.name<>e.name OR a.type<>e.type OR a.required<>e.required OR a.default_value IS NOT e.default_value OR a.pk<>e.pk OR a.hidden<>e.hidden)) THEN 'MISMATCH:COLUMNS'
 WHEN (SELECT COUNT(*) FROM index_shapes a WHERE a.table_name=t.name)<>t.indexes_count OR EXISTS(
 SELECT 1 FROM expected_indexes e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM index_shapes a WHERE a.table_name=e.table_name AND a.index_name=e.index_name AND a.is_unique=e.is_unique AND a.origin=e.origin AND a.partial=e.partial AND a.keys=e.keys)) THEN 'MISMATCH:INDEXES'
 WHEN NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name) OR EXISTS(
 SELECT 1 FROM expected_checks e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM normalized n WHERE n.name=t.name AND instr(n.compact,e.expression)>0)) OR EXISTS(
 SELECT 1 FROM normalized n WHERE n.name=t.name AND (length(n.compact)-length(replace(n.compact,'check(','')))/6<>t.checks_count) THEN 'MISMATCH:CHECK'
 WHEN EXISTS(SELECT 1 FROM pragma_foreign_key_list(t.name)) OR EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.type='trigger' AND s.tbl_name=t.name) OR EXISTS(
 SELECT 1 FROM normalized n WHERE n.name=t.name AND (instr(n.compact,'onconflict')>0 OR instr(n.compact,'collate')>0 OR instr(n.compact,'autoincrement')>0 OR instr(n.compact,'withoutrowid')>0)) THEN 'MISMATCH:EXTRA_CONSTRAINT'
 ELSE 'MATCH' END AS result FROM expected_tables t
)
SELECT 'table:'||name AS check_name,result FROM table_results
UNION ALL SELECT 'index:'||name,CASE WHEN keys='state:BINARY:0,next_due:BINARY:0' AND is_unique=0 AND partial=0 THEN 'MATCH' ELSE 'MISMATCH' END FROM index_shapes WHERE name IN ('mg_jobs_due','mg_notification_due')
UNION ALL SELECT 'environment',CASE WHEN COUNT(*)=1 AND SUM(CASE WHEN id=1 AND instance_id='0f1d8c9f-ae1b-40ef-bb42-f0b790bcd5fa' AND database_id='442fa9fd-25d3-4c01-bcc3-04be7b420cf5' AND location_id='LQ693S4H2NBZ8' THEN 1 ELSE 0 END)=1 THEN 'MATCH' ELSE 'MISMATCH' END FROM production_environment
UNION ALL SELECT 'orders_count',CAST(COUNT(*) AS TEXT) FROM orders
UNION ALL SELECT 'unexpected:'||name,type FROM sqlite_schema WHERE (name GLOB 'mg_*' OR name='production_environment') AND name NOT IN (SELECT name FROM expected_tables) AND name NOT IN ('mg_jobs_due','mg_notification_due')
ORDER BY check_name;
