# Android: GitHub検証ブランチからCodespacesへ引き継ぐ

## 現在の方針（2026-10-21）

ZIPのダウンロードによる受け渡しをやめ、dev/local-isolationへ承認後に必要なコードと手順書だけを保存する。今回はファイルの整理と保存対象のレビューまで。git add、コミット、プッシュ、Codespace作成、実デプロイ、DNS変更、Secrets登録は実行しない。mainへ変更・マージしない。

Access、ポリシー、検証D1 UUID、識別マーカー、DNS、Resend方針、前回の72件テスト/dry-run成功は確認済み。ユーザーへ再確認を求めない。

## Gitへ保存するもの・しないもの

保存対象は検証Workerのコード・設定テンプレート・オフライン安全チェック・テスト・手順書。GitHub Actionsワークフローは保存対象にしない。actions-review.mjsと対応するテストは既存72件の検証を維持するオフライン補助コードとして残すが、Actions実行を必要としない。

次の実値入りファイルはGitへ保存しない:

- validation/manifest.local.json
- validation/wrangler.local.json
- validation/square-seed.local.json
- validation/.generated/以下（実Variation対応表、ローカル入力JSON、Assets、SQL、ジャーナル等）
- .env、.dev.vars、APIトークン、秘密鍵、ローカルDB、node_modules、.wrangler

したがって、ブランチを開くだけでは実デプロイ可能な設定は揃わない。上記の公開ID・許可メール・実対応表を含むローカル設定は、承認後の別工程でGitを経由せず手動入力/一時転送する必要がある。既知のUUIDやマーカーを新規生成したり、商品/在庫を再登録したりしない。現段階でこの転送は完了したと扱わない。

## 承認・保存後にAndroidで行う操作

1. GitHubでawaiaune/yasoyahontenを開く。
2. ブランチをdev/local-isolationにする。
3. 保存完了時に報告されるコミットIDとGitHubの表示が一致することを確認する。確認するのは新規保存結果であり、Cloudflare設定の再確認ではない。
4. Code → Codespaces → Create codespace。必要ならChromeの「PC版サイト」。Codespacesには利用枠/料金があり得る。
5. ブラウザ版VS CodeのTerminal → New Terminalを開く。bashを使う。
6. `git branch --show-current` と `git rev-parse HEAD` で対象ブランチ/保存済みSHAを確認する。mainで編集・実行しない。
7. Node.js 24、npmを使う。nvmがあれば `nvm install 24` → `nvm use 24`。不明なら未レビューのセットアップスクリプトを貼らず停止する。
8. Codespaceのリポジトリルートで依存だけをインストールする。まだトークンを入力しない。

```sh
npm ci --prefix dev
npm install --prefix worker --no-save --package-lock=false wrangler@4.151.1
```

9. Git対象外設定の引き継ぎを別工程で行う。実対応表の3 IDと既存マーカーを維持する。設定不足を本番値で埋めたり、seed/API操作を実行したりしない。
10. 設定引き継ぎ後、同じルートから `node validation/prepare.mjs prepare` → `node validation/prepare.mjs check` → dry-run。成功したら実deploy前で停止し、最終承認を待つ。手動デプロイ計画のコマンドを使う。

今回のGit保存承認には、上記のCodespace作成、ローカル設定転送、認証、実デプロイを含めない。

## 一時認証（将来の最終承認後だけ）

GitHub/Codespaces/Worker Secretsへの登録は今回行わない。最終承認後、短期Cloudflareトークンをbashの非表示入力で一時的に環境へ渡す。値はGit/チャット/コマンド履歴/.envへ書かない。

```sh
set +x
trap 'unset CLOUDFLARE_API_TOKEN' EXIT
read -r -s -p 'Cloudflare API token（非表示）: ' CLOUDFLARE_API_TOKEN
printf '\n'
export CLOUDFLARE_API_TOKEN
```

依存インストールやコードレビューはトークン入力前に完了させる。実deploy後/延期時は `unset CLOUDFLARE_API_TOKEN` を実行し、短期トークンを失効する。ブラウザを閉じるだけではbashが残る場合がある。A案のトークンは同一アカウントの本番Workerも権限範囲に含み得るため、対象固定・短期利用・レビューで運用上制限する。

実行範囲と停止・復旧手順は[手動デプロイ計画](manual-validation-deploy.md)を参照。GitHubブランチへの保存とCloudflare公開は別の承認段階とする。
