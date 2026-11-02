WITH RECURSIVE
expected(name,definition) AS (VALUES
('mg_audit','[[0,"id","TEXT",0,null,1,0],[1,"actor","TEXT",1,null,0,0],[2,"action","TEXT",1,null,0,0],[3,"resource_id","TEXT",1,null,0,0],[4,"detail_json","TEXT",1,null,0,0],[5,"created_at","TEXT",1,null,0,0]]'),
('mg_commands','[[0,"id","TEXT",0,null,1,0],[1,"fingerprint","TEXT",1,null,0,0],[2,"result_json","TEXT",1,null,0,0]]'),
('mg_image_mappings','[[0,"image_id","TEXT",0,null,1,0],[1,"environment","TEXT",1,null,0,0],[2,"square_image_id","TEXT",1,null,0,0],[3,"created_at","TEXT",1,null,0,0]]'),
('mg_images','[[0,"id","TEXT",0,null,1,0],[1,"object_key","TEXT",1,null,0,0],[2,"mime","TEXT",1,null,0,0],[3,"bytes","INTEGER",1,null,0,0],[4,"width","INTEGER",1,null,0,0],[5,"height","INTEGER",1,null,0,0],[6,"created_at","TEXT",1,null,0,0]]'),
('mg_inventory_operations','[[0,"id","TEXT",0,null,1,0],[1,"variant_id","TEXT",1,null,0,0],[2,"kind","TEXT",1,null,0,0],[3,"quantity","INTEGER",1,null,0,0],[4,"reason","TEXT",1,null,0,0],[5,"actor","TEXT",1,null,0,0],[6,"before_quantity","INTEGER",1,null,0,0],[7,"after_quantity","INTEGER",0,null,0,0],[8,"state","TEXT",1,null,0,0],[9,"created_at","TEXT",1,null,0,0]]'))
SELECT 'columns:'||e.name AS check_name,CASE
WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=e.name AND s.type='table') THEN 'MISSING'
WHEN e.definition=(SELECT json_group_array(json(v)) FROM (SELECT json_array(p.cid,p.name,upper(trim(p.type)),p."notnull",p.dflt_value,p.pk,p.hidden) AS v FROM pragma_table_xinfo(e.name) p ORDER BY p.cid)) THEN 'MATCH'
ELSE 'MISMATCH:COLUMNS' END AS result FROM expected e ORDER BY e.name;
