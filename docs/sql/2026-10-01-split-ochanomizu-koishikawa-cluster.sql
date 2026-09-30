-- 往還録 SQL適用ログ：「江戸・日本橋」クラスタ（4図）を2つに分割
-- 適用日：未適用（ユーザーがSupabaseで実行し、結果をClaude Codeに報告する運用）
--
-- 背景：docs/sql/2026-08-21-phase1-schema.sqlのステップ7で、以下の4図を
-- 「江戸・日本橋」1クラスタにまとめていたが、実際の地点間距離を見ると
-- 図9・25（御茶ノ水〜小石川、2.5km）と図29・30（日本橋、0.4km）の間は
-- 4km前後離れており、2つに分けたほうが「その日1日で往還できる単位」
-- （docs/clusters.mdの切り分けの基準）に合う。
--
--   図9  東都駿台             千代田区神田駿河台（御茶ノ水）→ 新クラスタへ
--   図25 礫川雪ノ且           文京区小石川               → 新クラスタへ
--   図29 江戸日本橋           中央区日本橋               → 現クラスタに残す
--   図30 江都駿河町三井見世略図 中央区室町・駿河町         → 現クラスタに残す
--
-- クラスタ名は「令制国・場所」の形（docs/requirements.mdの命名規則）。
-- 場所名を2つ含める場合も、app/cluster-journey.tsxが
-- `cluster.name.split('・')[1]` で場所名部分を取り出す都合上、
-- 「・」区切りは1箇所のみにする（例：御茶ノ水小石川、間の区切りなし）。
--
-- 適用後、docs/clusters.mdのクラスタ数は28→29になる（README.md・
-- docs/requirements.mdの「28クラスタ」表記もあわせて更新済み）。

begin;

update locations set cluster = '江戸・御茶ノ水小石川', route_order = 1
  where figure_id = (select id from figures where slug = 'hokusai') and number = 9;
update locations set cluster = '江戸・御茶ノ水小石川', route_order = 2
  where figure_id = (select id from figures where slug = 'hokusai') and number = 25;

update locations set cluster = '江戸・日本橋', route_order = 1
  where figure_id = (select id from figures where slug = 'hokusai') and number = 29;
update locations set cluster = '江戸・日本橋', route_order = 2
  where figure_id = (select id from figures where slug = 'hokusai') and number = 30;

commit;

-- 確認：新旧クラスタがそれぞれ2件ずつ、他の変化がないこと
-- select number, title_jp, cluster, route_order from locations
--   where figure_id = (select id from figures where slug = 'hokusai') and number in (9, 25, 29, 30)
--   order by cluster, route_order;
