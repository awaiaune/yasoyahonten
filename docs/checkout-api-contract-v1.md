# 購入API契約 v1

初回公開前の契約。実装は worker/src/checkout-contract.js、クライアントは js/checkout-v1.js。公開サイト、購入API、管理APIは独立した境界を持つ。管理APIの機能フラグを購入APIの版や稼働状態の代わりに使わない。

## 経路と入力

- GET /api/v1/checkout-capabilities: contractVersion=1、supportedContracts=[1]、checkoutEnabled、maintenance、statusAvailable、releaseを返す。顧客情報・Secret・Square IDは返さない。
- POST /api/v1/quote: items=[{id,quantity}]。価格・送料はサーバーが確定する。
- POST /api/v1/inventory: 既存の在庫照会契約。書き込みではない。
- POST /api/v1/payments: contractVersion=1（省略はv1互換として扱う）、attemptId=UUID、sourceId、items、contact。attemptIdは注文単位で固定する。ProductionではIdempotency-KeyのUUIDでも受け付けるが、本文と両方指定した場合は一致必須。
- POST /api/v1/payments/status: attemptId。カードトークン不要。未確定時は同じIDでこの経路だけを照会する。

/ api/v1 と従来の /api/payments は同じPurchaseCoordinator namespace、クラス、固定Object名と台帳キーを使用する。別の決済経路や台帳は作らない。

カードトークンはメモリ内で一度だけ使用し、localStorage、DO台帳、ログへ保存しない。UUIDはSquare決済キーそのものではなく、サーバーがDOへ永続化する固定決済キーの起点。再送に別キーを発行しない。注文内容が変わった同一IDは409。

## 応答と判定

| 応答 | クライアントの動作 |
| --- | --- |
| ok=true、paymentId・orderReferenceあり | 注文完了。カートと注文IDを削除しthanks.htmlへ進む |
| HTTP 202 / ok=false / unknown等 | 完了と扱わない。IDとカートを保持しstatus照会のみ |
| status=declined | 確定失敗。IDを解除し、利用者の次の明示操作で新しい注文へ |
| statusの404・未送信prepared | 同じIDで初回送信が可能 |
| statusの404・送信済みsubmittedまたは旧メタデータなし | 未課金の証明ではない。再トークン化・再決済せず保留 |
| 409 PURCHASE_CLIENT_UPGRADE_REQUIRED | 安定IDのない旧画面。外部決済を実行せず更新案内 |
| 426 CHECKOUT_CONTRACT_UNSUPPORTED | 不明なAPI major/body版。別APIへ自動フォールバックしない |
| 503 CHECKOUT_DISABLED | 新規受付停止。注文の状態照会・復旧は継続する |
| 応答消失・タイムアウト・その他不明エラー | 送信済みIDを保持。状態照会のみ |

HTTP 2xxだけで成功と判断しない。202応答中でもstatus=declinedなら確定失敗として処理する。従来の安定ID付き /api/payments の保留応答は409/PURCHASE_PENDINGを維持し、旧画面による202誤認を防ぐ。全購入API応答はno-store。クライアントもfetch cache=no-store。

## クライアント状態・キャッシュ

yasoya_checkout_attempt_v1 の既存UUIDを維持し、追加のメタデータにはUUIDとprepared/submittedだけを保存する。POST前にsubmittedを保存する。旧UUIDしか残っていない場合は安全側でsubmitted扱い。明示的なCHECKOUT_DISABLED応答だけは送信前拒否のためpreparedへ戻せる。

checkout.htmlは旧checkout.jsを削除せず、新しいcheckout-v1.jsをreleaseクエリ付きで参照する。新画面は最初にcapabilitiesを読み、API未対応・メンテナンスではカードを初期化せず購入を止める。既存IDの状態照会は受付状態の確認より先に行う。利用者が押す「処理状況を確認」「購入画面を更新」を用意する。更新URLにはID・認証情報を含めない。

GitHub Pagesはリポジトリの_headersだけで任意のHTTPキャッシュ設定を保証できない。release付きJS参照は新HTMLの取得後に有効であり、開いたままの旧画面を強制更新できない。旧画面・CDNキャッシュへの最終防御はサーバーの契約チェック。公開時に実際のCache-ControlとCDNキャッシュを確認し、必要なら承認済みのパージを行う。

## 今後の後方互換性

v1公開後はv1経路・必須項目・状態判定・注文ID意味・DO台帳を維持する。任意項目の追加は旧クライアントが無視できる形式にする。意味・必須項目を変える場合はv2を別経路で追加し、v1と共存させる。キャッシュ済みクライアント、保留注文、手動復旧対象が残る間はv1を撤去しない。release値やクエリの変更だけでAPI契約を変更しない。公開済み購入JSは旧HTMLのために同じ内容で残し、新画面には新しいファイル名を使う。release-review compareで旧購入JSの変更・削除を拒否する。

未対応majorへの送信、202を成功扱いするクライアント、注文IDを捨てての再送は互換とはしない。異なる注文IDによる別注文まで同一注文と判定する機能はない。
