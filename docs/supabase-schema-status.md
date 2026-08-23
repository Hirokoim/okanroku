# Supabase スキーマ・RLS状態記録

最終検証日：2026年8月21日

このファイルは、`docs/requirements.md`の複数ユーザー化方針を実装するにあたり、Supabase側の現状を記録したものです。既存の同名ファイルがある場合はこの内容で置き換えてください。

## 検証結果サマリー

- **RLSは`records`・`figures`とも`relrowsecurity = true`で有効**（素通し状態ではない）
- **`records`のRLSは既に一般化されたパターン**（`auth.uid() = user_id`）で、個人ID決め打ちではなかった。移行作業は不要
- **`figures`はSELECTポリシーのみでINSERT/UPDATE/DELETEポリシーが0件**。RLS有効時にポリシーの無いcmdはデフォルト全拒否のため、現状はアプリ経由で誰も`figures`に書き込めない。管理者限定の書き込みポリシーを追加する必要あり
- **`figures`のSELECTの`roles`が`{public}`**で、未ログインでも読める状態。要件定義書は「全authenticatedユーザー」としており厳密には想定とズレる（実害は小さいが要判断）
- **`figures`の中身は8名の人物マスタ**（葛飾北斎・伊能忠敬・松尾芭蕉・歌川広重・十返舎一九・上杉鷹山・高山右近・徳川光圀。列は`id/slug/name/theme/created_at`）。**46図の地点マスターとは別物**で、`figures`に46図を入れる想定は誤解だったと確認済み（fugaku-36の56地点マスタとの混同）
- **Storage（`photos`バケット）のRLSは既に`auth.uid() = フォルダ名`で本人限定**になっている（select/insert/delete 3ポリシーとも同一条件）。追加対応不要

## RLSポリシー（`pg_policies`より）

| table | policy | cmd | roles | qual | with_check |
|---|---|---|---|---|---|
| figures | figures readable by all | SELECT | `{public}` | `true` | NULL |
| records | own records select | SELECT | — | `auth.uid() = user_id` | NULL |
| records | own records insert | INSERT | — | NULL | `auth.uid() = user_id` |
| records | own records update | UPDATE | — | `auth.uid() = user_id` | NULL |
| records | own records delete | DELETE | — | `auth.uid() = user_id` | NULL |
| storage.objects (`photos`) | own photos select | SELECT | — | `bucket_id='photos' AND auth.uid()::text = (storage.foldername(name))[1]` | NULL |
| storage.objects (`photos`) | own photos insert | INSERT | — | NULL | `bucket_id='photos' AND auth.uid()::text = (storage.foldername(name))[1]` |
| storage.objects (`photos`) | own photos delete | DELETE | — | `bucket_id='photos' AND auth.uid()::text = (storage.foldername(name))[1]` | NULL |

## `relrowsecurity`（RLS有効フラグ）

| relname | relrowsecurity | relforcerowsecurity |
|---|---|---|
| figures | true | false |
| records | true | false |

## `figures`テーブルの現行データ（8件）

| slug | name | theme |
|---|---|---|
| hokusai | 葛飾北斎 | 構図／富嶽三十六景 |
| inoh | 伊能忠敬 | 地形／日本地図の足跡 |
| basho | 松尾芭蕉 | 季節や言葉／奥の細道 |
| hiroshige | 歌川広重 | 街道や暮らし／東海道… |
| jippensha | 十返舎一九 | 旅の面白さ／東海道中… |
| yozan | 上杉鷹山 | 藩政改革／米沢藩 |
| takayama | 高山右近 | 異文化交流／キリシタン… |
| mitsukuni | 徳川光圀 | 学問継承／大日本史編… |

## `records`テーブルの現行カラム

`user_id`, `figure_id`, `location_name`, `work_label`, `latitude`, `longitude`, `photo_urls`, `photographed_at`, `diff_type`, `access_note`, `voice_transcript`, `edit_intent`, `created_at`, `updated_at`

**`is_public`列はまだ存在しない。**

## 残タスク（`docs/requirements.md` 5-B・6章に対応）

- [ ] `records`に`is_public`列を追加
  ```sql
  alter table records add column is_public boolean not null default false;
  ```
- [ ] `is_public=true`の他ユーザー行を読めるSELECTポリシーは、方針通りPhase2まで追加しない
- [ ] `figures`にINSERT/UPDATE/DELETEポリシーを追加（確認済み：現状0件で、アプリ経由では誰も書き込めない状態）
- [ ] `figures`のSELECTポリシーの`roles`が`{public}`（未ログインでも読める）になっている点を、`authenticated`限定にすべきか判断する
- [ ] 北斎46図の地点マスターは`figures`ではなく新規テーブル（`locations`等）で設計する（`figures`は8名の人物マスタと確認済み、46図とは別物）
