-- 往還録 SQL適用ログ：figures（人物マスタ）のRLSポリシー
-- 適用日：2026-08-20（docs/sql/2026-08-21-phase1-schema.sqlより前に適用済み）
--
-- 元は docs/次アクション手順書_2026-08-20.md の「優先度3」節にあったSQLを
-- ここへ移設したもの（docs/supabase-schema-status.md 残タスク「SQL所在の一本化」）。
-- 実行結果は2026-09-18の確認SQL②で実測済み：
--   figures_select_authenticated（SELECT, roles={authenticated}, qual=true）
--   figures_admin_write（ALL, roles={authenticated}, qual/with_check=管理者メール一致）
-- ポリシー名は手順書のfigures_select_allではなく、実際にはfigures_select_authenticatedで
-- 適用されていた（内容は同じ）。

begin;

drop policy if exists "<既存ポリシー名>" on figures;

-- 全ログインユーザーが読める
create policy "figures_select_authenticated" on figures
  for select to authenticated using (true);

-- 書き込みは管理者のみ（Phase1はロール管理を作らないため、メールアドレスで代用。
-- 実行時は <管理者のメールアドレス> を実際の値に置き換える。
-- 実際のメールアドレスをこのファイルやコミットに書かないこと——公開リポジトリのため）
create policy "figures_admin_write" on figures
  for all to authenticated
  using (auth.jwt() ->> 'email' = '<管理者のメールアドレス>')
  with check (auth.jwt() ->> 'email' = '<管理者のメールアドレス>');

grant select on figures to authenticated;

commit;
