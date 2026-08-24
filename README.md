# 往還録（Ōkanroku）

歴史上の人物が歩いた道を机上で管理し、現地での記録を1つの場所に蓄積するための、個人用フィールドノートツール。

葛飾北斎・伊能忠敬・松尾芭蕉ら歴史上の人物の足跡を巡る個人プロジェクトを支えるWebアプリケーションです。当面は葛飾北斎「富嶽三十六景」の推定描画地点（全46図）を対象に、現地訪問時の記録（写真・気づき・差分メモ）を1地点1レコードの構造化データとして蓄積します。

ここで生まれるデータは、単なる旅の記録ではなく、将来の教材・データ基盤（歴史資本MCPサーバー構想）の原料となる非公開の「原本」として設計されています。

## ドキュメント

| 資料 | 内容 |
|---|---|
| [`docs/requirements.md`](docs/requirements.md) | 要件定義書。機能要件・データモデルの設計判断（5-E）・開発フェーズ計画 |
| [`docs/clusters.md`](docs/clusters.md) | 北斎46図のクラスタ一覧。1日で往還できる単位に分けた28クラスタと、国別の富士の見え方 |
| [`docs/sql/`](docs/sql/) | Supabaseに適用するスキーマ変更SQL |
| [`docs/supabase-schema-status.md`](docs/supabase-schema-status.md) | Supabase側のスキーマ・RLSの検証記録 |

## 現在のステータス（2026-08-25時点）

Phase1のデータモデルが揃い、複数ユーザー対応のRLS上で動く状態になっています。

- [x] Google OAuth認証（ログイン・ログアウト）
- [x] 写真アップロード（Supabase Storage、非公開バケット・署名付きURL方式）
- [x] 最小限の記録入力フォーム＋一覧表示
- [x] 複数ユーザー前提のRLS（`records`は`auth.uid() = user_id`、Storageは本人のフォルダのみ）
- [x] `figures`（人物マスタ・8名）／`locations`（北斎46図の地点マスタ）／`records`／`record_photos`
- [x] 北斎46図のシードデータ投入と、28クラスタへの分類
- [ ] 記録フォームへの地点連携（`location_id`・写真ごとのGPS）
- [ ] 地図表示（Leaflet）と進捗ダッシュボード

実地でのフィールドワークは、当面 [MulmoClaude](https://github.com/receptron/mulmoclaude) 上の `fugaku-36` コレクションを主力として進め、そこで固まった記録項目・使い勝手を本アプリに反映していく方針です（詳細は `docs/requirements.md` の「1-A. 実験レイヤーとの役割分担」を参照）。

## 技術スタック

| 領域 | 採用 |
|---|---|
| フレームワーク | Next.js（App Router） |
| DB/認証 | Supabase（Google OAuth、RLSで本人のみアクセス可） |
| 画像ストレージ | Supabase Storage（非公開バケット、`lib/storage.ts`に処理を一本化） |
| スタイル | Tailwind CSS |
| デプロイ | Vercel（予定） |
| 言語 | TypeScript |

## セットアップ

`.env.example` を `.env.local` にコピーし、SupabaseのProject URLとanon keyを設定してから開発サーバーを起動します。

Supabase側には `figures` / `locations` / `records` / `record_photos` テーブル、それぞれのRLSポリシー、`photos` Storageバケットが必要です。スキーマの適用手順は [`docs/sql/`](docs/sql/) を参照してください。
