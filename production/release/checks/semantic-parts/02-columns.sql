WITH RECURSIVE
expected(name,definition) AS (VALUES
('mg_job_notifications','[[0,"job_id","TEXT",0,null,1,0],[1,"payload_json","TEXT",1,null,0,0],[2,"state","TEXT",1,"''pending''",0,0],[3,"attempts","INTEGER",1,"0",0,0],[4,"next_due","INTEGER",1,null,0,0],[5,"first_attempt_at","INTEGER",0,null,0,0],[6,"sent_at","TEXT",0,null,0,0],[7,"last_error","TEXT",0,null,0,0],[8,"created_at","TEXT",1,null,0,0]]'),
('mg_jobs','[[0,"id","TEXT",0,null,1,0],[1,"kind","TEXT",1,null,0,0],[2,"resource_id","TEXT",1,null,0,0],[3,"fingerprint","TEXT",1,null,0,0],[4,"payload_json","TEXT",1,null,0,0],[5,"body_json","TEXT",0,null,0,0],[6,"result_json","TEXT",0,null,0,0],[7,"state","TEXT",1,null,0,0],[8,"attempts","INTEGER",1,"0",0,0],[9,"next_due","INTEGER",1,null,0,0],[10,"last_error","TEXT",0,null,0,0],[11,"created_at","TEXT",1,null,0,0],[12,"updated_at","TEXT",1,null,0,0]]'),
('mg_locks','[[0,"variant_id","TEXT",0,null,1,0],[1,"job_id","TEXT",1,null,0,0]]'),
('mg_management_monitor','[[0,"id","INTEGER",0,null,1,0],[1,"last_scan_at","TEXT",0,null,0,0],[2,"alarm_state","TEXT",1,"''unknown''",0,0],[3,"updated_at","TEXT",1,null,0,0]]'),
('mg_mappings','[[0,"variant_id","TEXT",0,null,1,0],[1,"environment","TEXT",1,null,0,0],[2,"location_id","TEXT",1,null,0,0],[3,"item_id","TEXT",1,null,0,0],[4,"variation_id","TEXT",1,null,0,0],[5,"item_version","INTEGER",1,null,0,0],[6,"variation_version","INTEGER",1,null,0,0],[7,"sku","TEXT",1,null,0,0],[8,"instance_id","TEXT",1,null,0,0],[9,"verified_at","TEXT",1,null,0,0]]'))
SELECT 'columns:'||e.name AS check_name,CASE
WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=e.name AND s.type='table') THEN 'MISSING'
WHEN e.definition=(SELECT json_group_array(json(v)) FROM (SELECT json_array(p.cid,p.name,upper(trim(p.type)),p."notnull",p.dflt_value,p.pk,p.hidden) AS v FROM pragma_table_xinfo(e.name) p ORDER BY p.cid)) THEN 'MATCH'
ELSE 'MISMATCH:COLUMNS' END AS result FROM expected e ORDER BY e.name;
