# Supabase スキーマ・RLS状態記録

- **最終棚卸し日**：2026年9月12日
- **最後にSupabaseで実測した日**：2026年8月21日（`figures`・`records`・Storageのみ）

## このファイルの読み方

Supabaseの実体を見られるのはご本人だけである（開発環境からGoogleログインができず、私はSQLを実行できない）。そのため、この記録には**性質の違う2種類の情報が混ざっている**。取り違えると、済んだ作業をやり直したり、未適用のものを適用済みと誤認したりするため、行ごとに区別して書く。

| 印 | 意味 |
|---|---|
| **実測** | Supabaseに対して実際にクエリを投げ、返ってきた値を写したもの |
| **逆算** | `docs/sql/`のSQL・アプリのコード・作業ログから「こうなっているはず」と推定したもの |

**逆算は証拠ではない。** 逆算した内容は末尾の「確認SQL」で実測に格上げできる。次にRLSを触る前（Phase2の(6)人物ごとのアクセス権、(13)他ユーザーの公開記録閲覧）に一度流しておくこと。

### 2026-08-21版からの変更点

前版の「残タスク」5項目は**全て解消済み**のため削除した。前版は`records`に`is_public`が無く`diff_type`がある状態を記録していたが、これは`docs/sql/2026-08-21-phase1-schema.sql`のステップ2・5を適用する前の姿であり、現状と食い違っていた。

---

## 現行スキーマ（逆算：`docs/sql/`の適用結果＋アプリが実際に読み書きしている列）

### `figures`（人物マスタ・8件）

`id`, `slug`, `name`, `theme`, `created_at`

**実測（2026-08-21）**：8件。葛飾北斎 / 伊能忠敬 / 松尾芭蕉 / 歌川広重 / 十返舎一九 / 上杉鷹山 / 高山右近 / 徳川光圀。**46図の地点マスタではない**（混同の履歴は要件定義書5-B参照）。

### `locations`（地点マスタ・北斎46図）

| 列 | 追加元 | 備考 |
|---|---|---|
| `id`, `figure_id`, `number`, `title_jp`, `title_en`, `series`, `prefecture`, `modern_location`, `latitude`, `longitude`, `location_source`, `cluster`, `route_order`, `created_at` | ステップ1 | `unique (figure_id, number)`。`latitude/longitude`は比定地であり、訪問しても変わらない |
| `accessibility_class`, `accessibility_confidence`, `accessibility_reason`, `inaccessible_reason` | ステップ5 | 見える富士／見えない富士／心の中の富士の分類。`records.diff_type`から移設したもの |
| `location_confidence` | ステップ6 | `location_source`の「判明:」「不明:」の接頭辞を列に分離したもの |
| `image_url`, `image_source`, `image_license` | ステップ8 | 元絵の画像。46図すべてメトロポリタン美術館のCC0で照合済み |

`inaccessible_reason`は将来の詳細化用に列だけ用意したもので、現在は全件null。

### `records`（記録本体）

| 列 | 状態 |
|---|---|
| `id`, `user_id`, `figure_id`, `location_name`, `work_label`, `photographed_at`, `access_note`, `voice_transcript`, `edit_intent`, `created_at`, `updated_at` | 使用中。`user_id`はステップ2で`not null` ＋ `default auth.uid()`になった |
| `location_id`, `is_public`, `weather`(jsonb) | ステップ2で追加。使用中 |
| `diff_type` | **ステップ5で削除済み**（分類の置き場所が`locations`側だと判明したため） |
| `latitude`, `longitude` | **レガシー**。列は残っているが、アプリは読み書きしていない |
| `photo_urls` | **レガシー**。新規保存時に空配列`[]`を書いているだけで、実データは`record_photos`にある |

### `record_photos`（写真1枚ごとのGPS・撮影日時）

`id`, `record_id`, `storage_path`, `latitude`, `longitude`, `taken_at`, `sort_order`, `created_at`

`record_id`は`on delete cascade`。索引は`record_id`と`(latitude, longitude)`の2本。**記録の座標はこのテーブルが持つ**（天気の取得もここの座標を使う）。

### `figure_entitlements`（Phase2・**未適用**）

ステップ12に定義があるが**実行していない**。適用は破壊的変更で、`locations`のSELECTポリシーを「全authenticatedユーザー」から「アクセス権のある人物のみ」に差し替える。自分にアクセス権を付与する`insert`を忘れると自分も地図が見られなくなるため、実行前にステップ12の注記を必ず読むこと。

---

## RLSポリシー

全テーブル`relrowsecurity = true`（`figures`・`records`は2026-08-21に**実測**。`locations`・`record_photos`は作成SQLに`enable row level security`が含まれているため**逆算**）。

| table | policy | cmd | 条件 | 出所 |
|---|---|---|---|---|
| `figures` | `figures_select_all` | SELECT | `true`（`to authenticated`） | 逆算 |
| `figures` | `figures_admin_write` | ALL | `auth.jwt() ->> 'email'` が管理者のもの | 逆算 |
| `locations` | `locations_select_authenticated` | SELECT | `true`（`to authenticated`） | 逆算 |
| `locations` | `locations_admin_write` | ALL | `auth.jwt() ->> 'email'` が管理者のもの | 逆算 |
| `records` | own records select / insert / update / delete | 各1本 | `auth.uid() = user_id` | **実測**（2026-08-21） |
| `record_photos` | `record_photos_select_own` / `_insert_own` / `_update_own` / `_delete_own` | 各1本 | `records`を辿って`r.user_id = auth.uid()` | 逆算 |
| `storage.objects`（`photos`） | own photos select / insert / delete | 各1本 | `bucket_id='photos' AND auth.uid()::text = (storage.foldername(name))[1]` | **実測**（2026-08-21） |

**設計上の割り切り**：管理者判定は`profiles.role`のようなロール列ではなく、メールアドレスの決め打ちである。Phase1が実質1人運用のための意図的な選択で、`figures`／`locations`に他の人が書き込む必要が出た時点でロール列に置き換える（要件定義書5-B）。

`record_photos`が`user_id`を持たず`records`を辿るのは、所有者情報を2か所に持つと食い違うため（ステップ3のコメント）。

**Phase2への申し送り**：公開記録の写真を他ユーザーに見せるには「その写真の親レコードが`is_public`か」を辿る必要がある。Storageのポリシーから他テーブルを参照するのは書きにくく遅いため、サーバー側で署名付きURLを発行する方式を採る想定（要件定義書5-B）。

---

## 確認SQL（ご本人のみ・5分）

逆算した部分を実測に格上げするためのもの。Supabase SQL Editorに貼って一度に流せる。

```sql
-- ① 現行の列（records に diff_type が残っていないか、is_public/location_id/weather が有るか）
select table_name, column_name
from information_schema.columns
where table_name in ('locations', 'records', 'record_photos')
order by table_name, ordinal_position;

-- ② RLSポリシーの一覧
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where tablename in ('figures', 'locations', 'records', 'record_photos')
order by tablename, policyname;

-- ③ RLS有効フラグ（4テーブルとも true であること）
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('figures', 'locations', 'records', 'record_photos');

-- ④ ステップ14・15（39番の座標修正とクラスタ組み替え）が反映されているか
--    期待値：cluster = '駿河・田子の浦' / route_order = 3 / 緯度経度が富士市大淵地区
select number, title_jp, cluster, route_order, latitude, longitude
from locations where number in (18, 27, 39, 45) order by number;

-- ⑤ レガシー列に実データが残っていないか（残タスクの判断材料）
select count(*) as 記録件数,
       count(*) filter (where latitude is not null or longitude is not null) as 座標が入った記録,
       count(*) filter (where photo_urls is not null and array_length(photo_urls, 1) > 0) as photo_urlsが空でない記録
from records;
```

結果がこの記録と食い違っていたら、**実測のほうを正として**このファイルを書き換える。

---

## 残タスク

前版の5項目は全て解消済みのため、現時点で残っているのは以下。

- [ ] **上の確認SQLを流し、逆算部分を実測に格上げする**（Phase2でRLSを触る前に必須）
- [ ] `figures`のSELECTポリシーのロール。2026-08-21時点では`{public}`（未ログインでも読める）だった。ステップ相当のSQL（`docs/次アクション手順書_2026-08-20.md`）で`to authenticated`に差し替える想定だが、**実際に差し替わったかは未確認**。確認SQL②の`roles`列で判定する
- [ ] レガシー列（`records.latitude/longitude`・`records.photo_urls`）を削除するかの判断。確認SQL⑤で実データが0件なら`drop column`できる。**Phase1の途中では触らない**（記録の保存が壊れると原因の切り分けが難しくなるため、Phase1完了後にまとめて）
- [ ] `figures`の書き込みポリシーのSQLが`docs/sql/`ではなく`docs/次アクション手順書_2026-08-20.md`の中にある。次にSQLを追加するときに`docs/sql/`へ移し、適用済みSQLの所在を一本化する
- [ ] `figure_entitlements`（ステップ12）はPhase2で適用する。**単独で適用しない**——人物データの追加とセットで行う（理由はroadmap.md 4章）
