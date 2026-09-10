import { load } from 'exifreader'

export type ExifResult = {
  latitude: number | null
  longitude: number | null
  takenAt: string | null // ISO文字列
}

// EXIFの日時は "YYYY:MM:DD HH:MM:SS" 形式でタイムゾーン情報を持たない。
// 撮影地の現地時刻として書かれているため、端末のローカル時刻として解釈する。
function parseExifDateTime(value: string | undefined): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  return isNaN(date.getTime()) ? null : date.toISOString()
}

// EXIFにGPSが無い写真は珍しくない（要件定義書 機能②）。
// 解析自体が失敗した場合も含め、常に null 埋めの結果を返す（呼び出し側でtry/catch不要にする）。
//
// 以前はexifrを使っていたが、HEICファイルに埋め込まれたEXIF情報の場所を
// 見つけられず、GPS付きの実写真でも常にnullを返す不具合があった（2026-09-08、
// 実際にGPS埋め込みHEICを作って確認済み）。exifreaderに置き換えたところ、
// 同じ条件で正しく緯度経度を取得できた。
export async function readExif(file: File): Promise<ExifResult> {
  try {
    const tags = await load(file, { expanded: true })
    const latitude = tags.gps?.Latitude
    const longitude = tags.gps?.Longitude
    const takenAt = tags.exif?.DateTimeOriginal?.description ?? tags.exif?.DateTimeDigitized?.description

    return {
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      takenAt: parseExifDateTime(takenAt),
    }
  } catch {
    return { latitude: null, longitude: null, takenAt: null }
  }
}
