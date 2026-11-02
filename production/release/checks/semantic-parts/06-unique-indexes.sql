WITH RECURSIVE
expected_tables(name,columns_count,indexes_count,checks_count) AS (VALUES
('mg_products',9,2,1),
('mg_revisions',4,1,0),
('mg_stock_snapshot',3,1,0),
('mg_variants',2,1,0),
('production_environment',4,1,1)),
expected_indexes(table_name,index_name,is_unique,origin,partial,keys) AS (VALUES
('mg_products','',1,'u',0,'slug:BINARY:0'),
('mg_products','',1,'pk',0,'id:BINARY:0'),
('mg_revisions','',1,'pk',0,'product_id:BINARY:0,revision:BINARY:0'),
('mg_stock_snapshot','',1,'pk',0,'variant_id:BINARY:0'),
('mg_variants','',1,'pk',0,'id:BINARY:0'),
('production_environment','',1,'u',0,'instance_id:BINARY:0')),
actual_indexes AS (
 SELECT t.name AS table_name,i.name,CASE WHEN i.origin='c' THEN i.name ELSE '' END AS index_name,i."unique" AS is_unique,i.origin,i.partial,
 (SELECT group_concat(v,'') FROM (SELECT x.name||':'||x.coll||':'||x.desc||',' AS v FROM pragma_index_xinfo(i.name) x WHERE x.key=1 ORDER BY x.seqno)) AS raw_keys
 FROM expected_tables t JOIN pragma_index_list(t.name) i
),
index_shapes AS (SELECT *,rtrim(raw_keys,',') AS keys FROM actual_indexes)
SELECT 'indexes:'||t.name AS check_name,CASE WHEN NOT EXISTS(SELECT 1 FROM sqlite_schema s WHERE s.name=t.name AND s.type='table') THEN 'MISSING' WHEN (SELECT COUNT(*) FROM index_shapes a WHERE a.table_name=t.name)<>t.indexes_count OR EXISTS(
 SELECT 1 FROM expected_indexes e WHERE e.table_name=t.name AND NOT EXISTS(SELECT 1 FROM index_shapes a WHERE a.table_name=e.table_name AND a.index_name=e.index_name AND a.is_unique=e.is_unique AND a.origin=e.origin AND a.partial=e.partial AND a.keys=e.keys)) THEN 'MISMATCH:INDEXES' ELSE 'MATCH' END AS result FROM expected_tables t ORDER BY t.name;
