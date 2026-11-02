# スマホ用の独立した構造確認SQL

対象: yasoya-orders。追加SQLは適用済みのため再適用しない。各ファイルは単独の読み取りSELECT。01→12の順で1本ずつ実行する。コードフェンスやファイル名は貼り付けない。

- [01-columns.sql](01-columns.sql): 5行すべてMATCH（列・型・NOT NULL・既定値・主キー・隠し列）
- [02-columns.sql](02-columns.sql): 5行すべてMATCH（列・型・NOT NULL・既定値・主キー・隠し列）
- [03-columns.sql](03-columns.sql): 5行すべてMATCH（列・型・NOT NULL・既定値・主キー・隠し列）
- [04-unique-indexes.sql](04-unique-indexes.sql): 5行すべてMATCH（主キー/一意制約・索引数・列順・照合/降順・部分索引）
- [05-unique-indexes.sql](05-unique-indexes.sql): 5行すべてMATCH（主キー/一意制約・索引数・列順・照合/降順・部分索引）
- [06-unique-indexes.sql](06-unique-indexes.sql): 5行すべてMATCH（主キー/一意制約・索引数・列順・照合/降順・部分索引）
- [07-check-constraints.sql](07-check-constraints.sql): 15行すべてMATCH（CHECK条件、引用内文字を保持）
- [08-extra-constraints.sql](08-extra-constraints.sql): 15行すべてMATCH（想定外の外部キー・トリガー・衝突ポリシー等なし）
- [09-named-indexes.sql](09-named-indexes.sql): mg_jobs_due / mg_notification_dueの2行すべてMATCH
- [10-environment.sql](10-environment.sql): environment 1行がMATCH
- [11-orders-count.sql](11-orders-count.sql): orders_countが2（件数のみ表示）
- [12-unexpected-objects.sql](12-unexpected-objects.sql): 0行（想定外の管理用オブジェクトなし）

MISSING/MISMATCHまたは想定外の行があれば停止する。12だけは0行が正常。テーブル/索引/設定を変更するSQLは含まない。
