-- 往還録 Phase1 スキーマ更新
-- 作成日：2026-08-21
-- 対応：docs/requirements.md 5-B・5-E、docs/次アクション手順書_2026-08-20.md 優先度2〜3.5
--
-- 【実行方法】
--   Supabase ダッシュボード → SQL Editor に貼り付けて実行する。
--   ステップ1〜4に分かれている。上から順に、1つずつ実行して結果を確認すること。
--   各ステップは begin/commit で囲んであるため、途中で失敗しても元に戻る。
--
-- 【事前確認】
--   ステップ2で既存データの diff_type を変換する。実行前に下記で件数を確認すること。
--     select diff_type, count(*) from records group by diff_type;


-- ============================================================
-- ステップ1：locations（地点マスタ）テーブルの作成
-- ============================================================
-- 46図の「比定地」＝絵が描かれたと推定される静的な座標を持つ共有マスタ。
-- 実際に訪問した座標は record_photos 側が持つ（requirements.md 5-E③）。
-- 訪問ステータスは持たせない。ユーザーごとに異なるため records から導出する。

begin;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  figure_id uuid not null references figures(id),
  number integer not null,
  title_jp text not null,
  title_en text,
  series text,                    -- 北斎は「正景」「裏富士」。人物ごとに意味が変わるため enum にしない
  prefecture text,
  modern_location text,
  latitude numeric,               -- 比定地の緯度（静的。訪問しても変わらない）
  longitude numeric,              -- 比定地の経度（同上）
  location_source text,           -- 比定地の出典。「判明:」「不明:」で始まる
  cluster text,                   -- 地図フィルタ用の地理的まとまり。シード後に手動で埋める
  route_order integer,            -- 移動動線上の順序。未使用なら null のまま
  created_at timestamptz not null default now(),
  unique (figure_id, number)
);

alter table locations enable row level security;

-- 全ログインユーザーが読める共有マスタ
create policy "locations_select_authenticated" on locations
  for select to authenticated using (true);

-- 書き込みは管理者のみ。<メールアドレス> を実際のGoogleログインメールに置き換えること。
-- Phase1の割り切り（requirements.md 5-B）。ロール管理が必要になったら profiles.role に置き換える。
create policy "locations_admin_write" on locations
  for all to authenticated
  using (auth.jwt() ->> 'email' = '<メールアドレス>')
  with check (auth.jwt() ->> 'email' = '<メールアドレス>');

grant select on locations to authenticated;

commit;


-- ============================================================
-- ステップ2：records テーブルの更新
-- ============================================================
-- ・is_public 列を追加（列だけ用意し、公開読み取りRLSはPhase2まで作らない）
-- ・location_id 列を追加（nullable。46図に紐づかない自由な記録も許す）
-- ・diff_type を4値の汎用値に移行（requirements.md 5-E②）

begin;

alter table records add column if not exists is_public boolean not null default false;
alter table records add column if not exists location_id uuid references locations(id);
alter table records add column if not exists weather jsonb;  -- 訪問時点の天気スナップショット

-- user_id を必須にする。null のままだと auth.uid() = user_id が真にならず、
-- その行が誰からも永久に見えなくなる（エラーも出ないので気づけない）。
-- 下記で 0 件であることを確認してから NOT NULL を付けること。
--   select count(*) from records where user_id is null;
alter table records alter column user_id set not null;
alter table records alter column user_id set default auth.uid();

-- diff_type の値を移行する。
-- 旧: unchanged / changed / lost（3値）
-- 新: visible / not_visible / imagined / unjudged（4値）
--
-- 旧3値と新4値は一対一に対応しない（旧に「そもそも実景と違う」に当たる値が無く、
-- 「変わった」が visible なのか not_visible なのか判別できない）。
-- 実データが少ない前提で、判別できるものだけ移し、残りは unjudged にして再判定する。
update records set diff_type = 'visible'     where diff_type = 'unchanged';
update records set diff_type = 'not_visible' where diff_type = 'lost';
update records set diff_type = 'unjudged'    where diff_type = 'changed';

-- 旧値のCHECK制約が残っていると新しい値を弾くため、あれば落としてから張り直す。
-- 制約名は環境によって異なるので、下記で確認して読み替えること。
--   select conname from pg_constraint where conrelid = 'records'::regclass and contype = 'c';
alter table records drop constraint if exists records_diff_type_check;

alter table records add constraint records_diff_type_check
  check (diff_type is null or diff_type in ('visible', 'not_visible', 'imagined', 'unjudged'));

commit;


-- ============================================================
-- ステップ3：record_photos（写真）テーブルの作成
-- ============================================================
-- 写真1枚ごとに実測GPSと撮影日時を持つ（requirements.md 5-E④）。
-- 枚数上限はここでは制約せず、アプリ側のバリデーションで持つ（後から変更しやすいため）。

begin;

create table if not exists record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references records(id) on delete cascade,
  storage_path text not null,     -- lib/storage.ts が返すパス（{user_id}/{uuid}.{ext}）
  latitude numeric,               -- 実際に撮影した座標。EXIF から自動抽出、無ければ手動指定
  longitude numeric,
  taken_at timestamptz,           -- EXIF の撮影日時
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists record_photos_record_id_idx on record_photos(record_id);
-- 「この地点で他の人は何を感じたか」の近傍検索（requirements.md 5-E⑤）で使う
create index if not exists record_photos_coords_idx on record_photos(latitude, longitude);

alter table record_photos enable row level security;

-- 親レコードの所有者のみアクセスできる。
-- record_photos 自体は user_id を持たず、records を辿って判定する
-- （所有者情報を2か所に持つと食い違うため）。
create policy "record_photos_select_own" on record_photos
  for select to authenticated
  using (exists (
    select 1 from records r where r.id = record_photos.record_id and r.user_id = auth.uid()
  ));

create policy "record_photos_insert_own" on record_photos
  for insert to authenticated
  with check (exists (
    select 1 from records r where r.id = record_photos.record_id and r.user_id = auth.uid()
  ));

create policy "record_photos_update_own" on record_photos
  for update to authenticated
  using (exists (
    select 1 from records r where r.id = record_photos.record_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from records r where r.id = record_photos.record_id and r.user_id = auth.uid()
  ));

create policy "record_photos_delete_own" on record_photos
  for delete to authenticated
  using (exists (
    select 1 from records r where r.id = record_photos.record_id and r.user_id = auth.uid()
  ));

grant select, insert, update, delete on record_photos to authenticated;

commit;


-- ============================================================
-- ステップ4：北斎46図のシードデータ投入
-- ============================================================
-- 出典：MulmoClaude の fugaku-36 コレクション
--   ~/mulmoclaude/artifacts/spreadsheets/2026/08/fugaku36.csv（46行ちょうど）
-- cluster と route_order は CSV に無いため null。投入後に手動で埋める。

begin;

insert into locations
  (figure_id, number, title_jp, title_en, series, prefecture, modern_location, latitude, longitude, location_source)
values
  ((select id from figures where slug = 'hokusai'), 1, '神奈川沖浪裏', 'The Great Wave off Kanagawa', '正景', '神奈川県', '神奈川沖', 35.35, 139.65, '不明:神奈川宿沖/本牧沖/木更津方面から江戸湾説など複数あり単一点特定不可（Wikipedia「神奈川沖浪裏」、KIP神奈川産業振興センター）'),
  ((select id from figures where slug = 'hokusai'), 2, '凱風快晴', 'Fine Wind, Clear Morning (Red Fuji)', '正景', '山梨県・静岡県', '富士山北面', 35.365, 138.74, '不明:甲斐国側/駿河国側で未決着（Wikipedia「凱風快晴」、東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 3, '山下白雨', 'Thunderstorm beneath the Summit', '正景', '静岡県', '富士山', 35.362, 138.73, '不明:具体的視点未特定（Wikipedia「山下白雨」）'),
  ((select id from figures where slug = 'hokusai'), 4, '深川万年橋下', 'Fuji Seen Through the Mannen Bridge at Fukagawa', '正景', '東京都', '江東区深川・万年橋', 35.6819, 139.7975, '判明:万年橋（江東区清澄2丁目）（Wikipedia、fugaku36.net）'),
  ((select id from figures where slug = 'hokusai'), 5, '尾州不二見原', 'Fujimigahara in Owari Province', '正景', '愛知県', '名古屋市中川区富士見町付近', 35.1567, 136.9066, '判明:名古屋市中区富士見町（Wikipedia「尾州不二見原」）'),
  ((select id from figures where slug = 'hokusai'), 6, '甲州犬目峠', 'Inume Pass in Kai Province', '正景', '山梨県', '上野原市犬目・犬目峠', 35.632, 139.108, '不明:上野原市犬目宿〜下鳥沢宿間の峠、具体地点未確定（Wikipedia「甲州犬目峠」）'),
  ((select id from figures where slug = 'hokusai'), 7, '武州千住', 'Senju in Musashi Province', '正景', '東京都', '足立区千住', 35.7511, 139.7997, '判明:足立区千住桜木1-15（記念碑）（足立区立郷土博物館、Yahoo!マップ）'),
  ((select id from figures where slug = 'hokusai'), 8, '青山円座松', 'The Circular Pine Trees of Aoyama', '正景', '東京都', '港区青山', 35.6718, 139.7135, '判明:龍巌寺（渋谷区神宮前2-3-8）（Wikipedia「青山円座松」）'),
  ((select id from figures where slug = 'hokusai'), 9, '東都駿台', 'Surugadai in Edo', '正景', '東京都', '千代田区神田駿河台', 35.6989, 139.7649, '判明:神田駿河台（千代田区、御茶ノ水）（Wikipedia「東都駿台」）'),
  ((select id from figures where slug = 'hokusai'), 10, '武州玉川', 'Tama River in Musashi Province', '正景', '東京都・神奈川県', '多摩川（二子玉川付近）', 35.572, 139.482, '不明:多摩川流域、具体地点判断し難い（江戸伝統木版画工芸協同組合、Wikipedia「武州玉川」）'),
  ((select id from figures where slug = 'hokusai'), 11, '相州七里浜', 'Shichiri Beach in Sagami Province', '正景', '神奈川県', '鎌倉市七里ガ浜', 35.3079, 139.5316, '判明:稲村ヶ崎（鎌倉市）（Wikipedia「相州七里浜」）'),
  ((select id from figures where slug = 'hokusai'), 12, '武陽佃嶌', 'Tsukudajima in Musashi Province', '正景', '東京都', '中央区佃島', 35.6647, 139.7834, '判明:佃島（中央区佃1丁目）（Wikipedia「武陽佃嶌」）'),
  ((select id from figures where slug = 'hokusai'), 13, '常州牛堀', 'Ushihori in Hitachi Province', '正景', '茨城県', '潮来市牛堀', 35.9328, 140.5768, '判明:牛堀（茨城県潮来市）（文化遺産オンライン）'),
  ((select id from figures where slug = 'hokusai'), 14, '甲州石班澤', 'Kajikazawa in Kai Province', '正景', '山梨県', '富士川町鰍沢', 35.5478, 138.4459, '判明:鰍沢（山梨県南巨摩郡富士川町）（Wikipedia「甲州石班澤」）'),
  ((select id from figures where slug = 'hokusai'), 15, '信州諏訪湖', 'Lake Suwa in Shinano Province', '正景', '長野県', '諏訪市・諏訪湖', 36.0751, 138.0867, '判明:下諏訪町（長野県諏訪郡）（fugaku36.net）'),
  ((select id from figures where slug = 'hokusai'), 16, '遠江山中', 'In the Mountains of Totomi Province', '正景', '静岡県', '浜松市天竜区付近', 34.748, 137.878, '不明:静岡県西部、場所特定要素なし（浜松市天竜区水窪など候補）（Wikipedia「遠江山中」、アダチ版画技術保存財団）'),
  ((select id from figures where slug = 'hokusai'), 17, '甲州三嶌越', 'Mishima Pass in Kai Province', '正景', '山梨県', '山中湖村・三国峠付近', 35.3833, 138.8589, '判明:籠坂峠（山中湖村〜御殿場市境）（東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 18, '駿州江尻', 'Ejiri in Suruga Province', '正景', '静岡県', '静岡市清水区（旧江尻）', 35.0163, 138.4906, '判明:姥ヶ池付近（静岡市清水区）（Wikipedia「駿州江尻」）'),
  ((select id from figures where slug = 'hokusai'), 19, '東都浅艸本願寺', 'Honganji Temple at Asakusa in Edo', '正景', '東京都', '台東区浅草・東本願寺', 35.7124, 139.7896, '判明:東本願寺（台東区西浅草1丁目）（文化遺産オンライン）'),
  ((select id from figures where slug = 'hokusai'), 20, '相州梅沢左', 'Umezawa in Sagami Province', '正景', '神奈川県', '南足柄市梅沢付近', 35.3099, 139.2464, '判明:梅沢（神奈川県中郡二宮町）（東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 21, '下目黒', 'Shimo-Meguro', '正景', '東京都', '目黒区下目黒', 35.633, 139.712, '不明:目黒区下目黒一帯、具体地点不明（碑文谷方向説あり）（Wikipedia「下目黒 (葛飾北斎)」）'),
  ((select id from figures where slug = 'hokusai'), 22, '上総ノ海路', 'The Kazusa Province Sea Route', '正景', '千葉県', '上総沖（東京湾・外房）', 35.2531, 139.8267, '判明:金谷浦（千葉県富津市）（Wikipedia「上總ノ海路」）'),
  ((select id from figures where slug = 'hokusai'), 23, '登戸浦', 'Noboto Lagoon', '正景', '千葉県', '市川市登戸付近', 35.5983, 140.0994, '判明:登渡神社（千葉市中央区登戸）（ジャパンサーチ）'),
  ((select id from figures where slug = 'hokusai'), 24, '東海道吉田', 'Yoshida on the Tokaido Road', '正景', '愛知県', '豊橋市（旧吉田宿）', 34.7686, 137.391, '判明:吉田宿（愛知県豊橋市）（日本製品遺産協会）'),
  ((select id from figures where slug = 'hokusai'), 25, '礫川雪ノ且', 'Dawn after a Snowfall at Koishikawa', '正景', '東京都', '文京区小石川', 35.7139, 139.744, '判明:伝通院付近（文京区小石川）（Wikipedia「礫川雪ノ且」）'),
  ((select id from figures where slug = 'hokusai'), 26, '御厩川岸より両国橋夕陽見', 'Sunset across the Ryogoku Bridge from the Bank of the Ommaya River', '正景', '東京都', '台東区蔵前・両国橋', 35.7025, 139.7942, '判明:厩橋付近（台東区蔵前〜墨田区本所1丁目）（Wikipedia、東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 27, '東海道江尻田子の浦略図', 'Tago-no-ura Inlet, Ejiri on the Tokaido', '正景', '静岡県', '富士市田子の浦', 35.138, 138.688, '不明:清水湊沖合説と吉原宿・由比宿説など複数説あり（Wikipedia「東海道江尻田子の浦略図」）'),
  ((select id from figures where slug = 'hokusai'), 28, '相州江の嶌', 'Enoshima in Sagami Province', '正景', '神奈川県', '藤沢市江の島', 35.2989, 139.4803, '判明:江の島（神奈川県藤沢市）（日本製品遺産協会）'),
  ((select id from figures where slug = 'hokusai'), 29, '江戸日本橋', 'Nihonbashi Bridge in Edo', '正景', '東京都', '中央区日本橋', 35.6828, 139.7745, '判明:日本橋（中央区日本橋）（一般に自明）'),
  ((select id from figures where slug = 'hokusai'), 30, '江都駿河町三井見世略図', 'A General View of Mitsui''s Shop at Surugacho in Edo', '正景', '東京都', '中央区室町・駿河町（三井越後屋）', 35.6858, 139.7731, '判明:日本橋室町・三越前（中央区）（東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 31, '相州箱根湖水', 'Lake Hakone in Sagami Province', '正景', '神奈川県', '箱根町・芦ノ湖', 35.205, 139.0233, '判明:芦ノ湖（神奈川県箱根町）（日本製品遺産協会）'),
  ((select id from figures where slug = 'hokusai'), 32, '甲州三坂水面', 'Misaka Water Surface in Kai Province', '正景', '山梨県', '富士河口湖町・三ツ峠から見た河口湖', 35.4989, 138.7756, '判明:御坂峠（山梨県笛吹市御坂町）（日本製品遺産協会）'),
  ((select id from figures where slug = 'hokusai'), 33, '隠田の水車', 'The Watermill at Onden', '正景', '東京都', '渋谷区原宿（旧隠田村）', 35.6702, 139.7064, '判明:表参道付近（渋谷区神宮前）（江戸伝統木版画工芸協同組合）'),
  ((select id from figures where slug = 'hokusai'), 34, '東海道程ヶ谷', 'Hodogaya on the Tokaido Road', '正景', '神奈川県', '横浜市保土ケ谷区（旧程ヶ谷宿）', 35.4468, 139.5865, '判明:保土ヶ谷宿（横浜市保土ケ谷区）（一般定説）'),
  ((select id from figures where slug = 'hokusai'), 35, '隅田川関屋の里', 'Seki-ya on the Sumida River', '正景', '東京都', '足立区関屋・隅田川', 35.7407, 139.8058, '判明:関屋（足立区）（文化遺産オンライン）'),
  ((select id from figures where slug = 'hokusai'), 36, '五百らかん寺さゞゐどう', 'Sazai-do, Five Hundred Rakan Temple', '正景', '東京都', '墨田区本所・五百羅漢寺（現在は目黒区）', 35.6871, 139.8228, '判明:五百羅漢寺跡（江東区大島4丁目）（fugaku36.net、東京富士美術館）'),
  ((select id from figures where slug = 'hokusai'), 37, '身延川裏不二', 'Reverse Fuji from Minobu River', '裏富士', '山梨県', '身延町・富士川（身延川）', 35.373, 138.438, '不明:南巨摩郡身延町付近、「身延川」が富士川か久遠寺周辺川か諸説あり（Wikipedia「身延川裏不二」）'),
  ((select id from figures where slug = 'hokusai'), 38, '従千住花街眺望ノ不二', 'Fuji from the Pleasure Quarter at Senju', '裏富士', '東京都', '足立区千住', 35.7454, 139.7996, '判明:千住宮元町（足立区）（fugaku36.net）'),
  ((select id from figures where slug = 'hokusai'), 39, '駿州片倉茶園ノ不二', 'Tea Plantation at Katakura in Suruga Province', '裏富士', '静岡県', '富士市片倉・茶畑', 34.982, 138.418, '不明:静岡県富士市一帯、「片倉」の具体地点未詳（文化遺産オンライン）'),
  ((select id from figures where slug = 'hokusai'), 40, '東海道品川御殿山ノ不二', 'Goten-yama-hill, Shinagawa on the Tokaido', '裏富士', '東京都', '品川区御殿山', 35.6213, 139.7396, '判明:御殿山（品川区北品川3丁目）（Wikipedia）'),
  ((select id from figures where slug = 'hokusai'), 41, '甲州伊沢暁', 'Dawn at Isawa in Kai Province', '裏富士', '山梨県', '笛吹市石和町', 35.6577, 138.6299, '判明:石和宿（山梨県笛吹市石和町）（Wikipedia「甲州伊沢暁」）'),
  ((select id from figures where slug = 'hokusai'), 42, '本所立川', 'Tatekawa in Honjo', '裏富士', '東京都', '墨田区本所・立川', 35.6965, 139.8031, '判明:立川（墨田区）（Wikipedia「本所立川」）'),
  ((select id from figures where slug = 'hokusai'), 43, '東海道金谷ノ不二', 'Mount Fuji from the Tokaido at Kanaya', '裏富士', '静岡県', '島田市金谷（旧金谷宿）', 34.8151, 138.1449, '判明:金谷宿（静岡県島田市東町）（fugaku36.net）'),
  ((select id from figures where slug = 'hokusai'), 44, '相州仲原', 'Nakahara in Sagami Province', '裏富士', '神奈川県', '平塚市中原付近', 35.3339, 139.3384, '判明:中原（神奈川県平塚市）（Wikipedia「相州仲原」）'),
  ((select id from figures where slug = 'hokusai'), 45, '駿州大野新田', 'Ono Shinden, Suruga Province', '裏富士', '静岡県', '富士市大野付近', 35.1442, 138.6591, '判明:大野新田（静岡県富士市）（日本製品遺産協会）'),
  ((select id from figures where slug = 'hokusai'), 46, '諸人登山', 'Climbing Fuji', '裏富士', '静岡県', '富士山・登山道', 35.3606, 138.7274, '判明:富士山吉田口登山道（富士山頂）（一般に自明）');

commit;


-- ============================================================
-- 実行後の確認
-- ============================================================
-- 46件入っているか
--   select count(*) from locations;
-- 正景／裏富士の内訳
--   select series, count(*) from locations group by series;
-- diff_type が新しい4値になっているか
--   select diff_type, count(*) from records group by diff_type;
--
-- 確認後、アプリ（npm run dev）でログインし、記録の表示・保存が壊れていないことを確かめること。


-- ============================================================
-- 残タスク（このSQLの範囲外）
-- ============================================================
-- ・locations.cluster を手動で埋める（地図フィルタ用。「江戸市中」「墨田区」など）
-- ・records.location_name / work_label は location_id が未設定のときだけ使う
--   （requirements.md 5-E⑦。両方使うと同じ地点の名前が2か所に保存されて食い違う）
-- ・アプリ側で写真の枚数上限（5枚程度）をバリデーションする
-- ・既存 records.photo_urls から record_photos への移行（実データがあれば）
