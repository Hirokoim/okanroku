-- 往還録 SQL：ステップ18 — records のレガシー列（latitude/longitude/photo_urls）を削除
--
-- 背景（docs/supabase-schema-status.md 残タスク参照）：
-- records.latitude/longitude と records.photo_urls は、record_photos テーブル導入前の
-- 名残りの列で、アプリはもう読み書きしていない（photo_urls への insert 時の空配列[]書き込みは
-- 2026-09-18にコードから削除済み。app/import-form.tsx・app/locations/[id]/record-form.tsx）。
--
-- 2026-09-18の実測で、座標が入った記録が1件だけ残っていることを確認した。
-- 中身は location_name='東京', latitude=50, longitude=50, photographed_at=2026-07-09,
-- 写真0件（record_photos に紐づく行なし）。実在しない座標（本物の東京は緯度35.6/経度139.7
-- 付近）であり、records テーブル導入直後の開発用テストデータと判断し、削除する。
--
-- 実行前に必ずアプリで記録の保存・表示を確認すること（vibe-coding-workflow）。

begin;

-- 開発用テストデータの削除（「東京」/(50,50)/写真なし、2026-07-22作成）
delete from records where id = '1af2416e-89b2-4f09-89c4-b95034101cc4';

-- レガシー列の削除
alter table records drop column if exists latitude;
alter table records drop column if exists longitude;
alter table records drop column if exists photo_urls;

commit;

-- 実行後の確認：
-- select column_name from information_schema.columns where table_name = 'records';
-- で latitude / longitude / photo_urls が消えていることを確認する。
