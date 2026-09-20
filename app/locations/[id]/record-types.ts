// 地点詳細で扱う「自分の記録」の型。
//
// 一覧（location-records.tsx）と編集フォーム（edit-record-form.tsx）の
// 両方が同じ型を使う。一覧が編集フォームを読み込み、編集フォームが一覧から
// 型を借りる形になっていて循環参照になっていたため、型だけをここに分けた。

import type { WeatherSnapshot } from '@/lib/weather'

export type RecordPhoto = {
  id: string
  /** Storage上のパス。削除（record_photosの行削除にあわせてファイル本体も消す）に使う */
  storage_path: string
  /** 署名付きURL。発行に失敗した場合はnull */
  url: string | null
  latitude: number | null
  longitude: number | null
  taken_at: string | null
  /**
   * HEIC形式のまま保存されている古い写真。ChromeやFirefoxは
   * HEICを<img>で表示できないため、黙って壊れて見えるより
   * 理由を出す（2026-09-08以降の保存分はJPEGに変換済み）。
   */
  unsupportedFormat: boolean
}

export type LocationRecord = {
  id: string
  photographed_at: string | null
  created_at: string
  edit_intent: string | null
  voice_transcript: string | null
  access_note: string | null
  is_public: boolean
  weather: WeatherSnapshot | null
  photos: RecordPhoto[]
}
