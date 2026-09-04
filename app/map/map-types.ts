// 地図が扱うデータの形。
// サーバー側（map/page.tsx）が組み立て、ブラウザ側（map-view.tsx）が受け取る
// 境界の型なので、どちらからも参照できるようこのファイルに置く。

/** 地点マスタ（locations）から地図に出す1件分 */
export type LocationPin = {
  id: string
  number: number
  title_jp: string
  title_en: string | null
  series: string | null
  prefecture: string | null
  modern_location: string | null
  cluster: string | null
  latitude: number | null
  longitude: number | null
  accessibility_class: string | null
  image_url: string | null
}

/** 実際に撮影した地点（record_photos）。比定地とは別に重ねて表示する */
export type VisitPoint = {
  id: string
  latitude: number
  longitude: number
  taken_at: string | null
  number: number
  title_jp: string
}

/** ツールバーのシリーズ絞り込み。'all'は絞り込みなし */
export type SeriesFilter = 'all' | '正景' | '裏富士'
