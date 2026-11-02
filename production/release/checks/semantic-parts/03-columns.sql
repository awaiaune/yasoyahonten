WITH RECURSIVE
expected(name,definition) AS (VALUES
('mg_products','[[0,"id","TEXT",0,null,1,0],[1,"slug","TEXT",1,null,0,0],[2,"sort_order","INTEGER",1,"0",0,0],[3,"status","TEXT",1,"''draft''",0,0],[4,"version","INTEGER",1,null,0,0],[5,"draft_revision","INTEGER",1,null,0,0],[6,"published_revision","INTEGER",0,null,0,0],[7,"created_at","TEXT",1,null,0,0],[8,"updated_at","TEXT",1,null,0,0]]'),
('mg_revisions','[[0,"product_id","TEXT",1,null,1,0],[1,"revision","INTEGER",1,null,2,0],[2,"data_json","TEXT",1,null,0,0],[3,"created_at","TEXT",1,null,0,0]]'),
('mg_stock_snapshot','[[0,"variant_id","TEXT",0,null,1,0],[1,"quantity","INTEGER",1,null,0,0],[2,"observed_at","TEXT",1,null,0,0]]'),
('mg_variants','[[0,"id","TEXT",0,null,1,0],[1,"product_id","TEXT",1,null,0,0]]'),
('production_environment','[[0,"id","INTEGER",0,null,1,0],[1,"instance_id","TEXT",1,null,0,0],[2,"database_id","TEXT",1,null,0,0],[3,"location_id","TEXT",1,null,0,0]]'))
SELECT 'columns:'||e.name AS check_name,CASE
WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=e.name AND s.type='table') THEN 'MISSING'
WHEN e.definition=(SELECT json_group_array(json(v)) FROM (SELECT json_array(p.cid,p.name,upper(trim(p.type)),p."notnull",p.dflt_value,p.pk,p.hidden) AS v FROM pragma_table_xinfo(e.name) p ORDER BY p.cid)) THEN 'MATCH'
ELSE 'MISMATCH:COLUMNS' END AS result FROM expected e ORDER BY e.name;
