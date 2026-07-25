# 往還録（Ōkanroku）

歴史上の人物が歩いた道を机上で管理し、現地での記録を1つの場所に蓄積するための、個人用フィールドノートツール。

葛飾北斎・伊能忠敬・松尾芭蕉ら歴史上の人物の足跡を巡る個人プロジェクトを支えるWebアプリケーションです。当面は葛飾北斎「富嶽三十六景」の推定描画地点（全46図）を対象に、現地訪問時の記録（写真・気づき・差分メモ）を1地点1レコードの構造化データとして蓄積します。

ここで生まれるデータは、単なる旅の記録ではなく、将来の教材・データ基盤（歴史資本MCPサーバー構想）の原料となる非公開の「原本」として設計されています。

詳細な要件は [`docs/requirements.md`](docs/requirements.md) を参照してください。

## 現在のステータス（2026-07-25時点）

Day1「動く骨格」が完成しています。

- [x] Google OAuth認証（ログイン・ログアウト）
- [x] `figures`（人物マスタ・8名分シード済み）／`records`（記録本体）のテーブル設計・RLS
- [x] 写真アップロード（Supabase Storage、非公開バケット・署名付きURL方式）
- [x] 最小限の記録入力フォーム＋一覧表示

実地でのフィールドワークは、当面 [MulmoClaude](https://github.com/receptron/mulmoclaude) 上の `fugaku-36` コレクションを主力として進め、そこで固まった記録項目・使い勝手を本アプリに反映していく方針です（詳細は `docs/requirements.md` の「1-A. 実験レイヤーとの役割分担」を参照）。

地点マスター管理・地図表示・進捗ダッシュボードは、上記の実地検証が進むまで保留としています。

## 技術スタック

| 領域 | 採用 |
|---|---|
| フレームワーク | Next.js（App Router） |
| DB/認証 | Supabase（Google OAuth、RLSで本人のみアクセス可） |
| 画像ストレージ | Supabase Storage（非公開バケット、`lib/storage.ts`に処理を一本化） |
| スタイル | Tailwind CSS |
| デプロイ | Vercel（予定） |
| 言語 | TypeScript |
[http://localhost:3000](http://localhost:3000) を開いてください。

Supabase側で `figures` / `records` テーブル・RLSポリシー・`photos` Storageバケットの作成が別途必要です。手順は `docs/requirements.md` を参照してください。
