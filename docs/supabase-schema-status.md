# Supabase スキーマ・RLS状態記録

最終検証日：2026年8月20日

このファイルは、`docs/requirements.md`の複数ユーザー化方針を実装するにあたり、Supabase側の現状を記録したものです。既存の同名ファイルがある場合はこの内容で置き換えてください。

## 検証結果サマリー

**RLSは既に一般化されたパターンで実装されており、個人ID決め打ちではなかった。** `docs/claude-code-handoff.md`優先度1の懸念事項は解消済み。移行作業は不要。

## RLSポリシー（`pg_policies`より）

| table | policy | cmd | qual | with_check |
|---|---|---|---|---|
| figures | figures readable by all | SELECT | `true` | NULL |
| records | own records select | SELECT | `auth.uid() = user_id` | NULL |
| records | own records insert | INSERT | NULL | `auth.uid() = user_id` |
| records | own records update | UPDATE | `auth.uid() = user_id` | NULL |
| records | own records delete | DELETE | `auth.uid() = user_id` | NULL |

- `figures`：`true`条件のため既に全ユーザー共有の読み取り専用マスタとして機能している。INSERT/UPDATE/DELETEポリシーの有無・内容は未確認（管理者限定にするなら別途確認・設定が必要）
- `records`：4ポリシーすべて`user_id`カラムを参照する一般化パターン。ハードコードされた特定UUIDは無い

## `records`テーブルの現行カラム

`user_id`, `figure_id`, `location_name`, `work_label`, `latitude`, `longitude`, `photo_urls`, `photographed_at`, `diff_type`, `access_note`, `voice_transcript`, `edit_intent`, `created_at`, `updated_at`

**`is_public`列はまだ存在しない。**

## 残タスク（`docs/requirements.md` 5-B・6章に対応）

- [ ] `records`に`is_public`列を追加
  ```sql
  alter table records add column is_public boolean not null default false;
  ```
- [ ] `is_public=true`の他ユーザー行を読めるSELECTポリシーは、方針通りPhase2まで追加しない
- [ ] `figures`のINSERT/UPDATE/DELETEポリシーが管理者限定になっているか未確認（要確認）
- [ ] `figures`に北斎46図のシードデータを投入（現状8名分のまま）
