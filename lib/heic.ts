// iPhoneが標準で撮る写真はHEIC形式になる。ところがChrome・Firefox・Edgeは
// HEVCコーデックのライセンスの都合でHEICを<img>に永久に表示できない
// （対応予定もない。表示できるのはSafariだけ）。
// アップロード前にブラウザ側でJPEGへ変換しておくことで、保存後どのブラウザで
// 開いても写真が表示されるようにする。
//
// heic-to は変換に使うWASMをnpmパッケージ自体に含んでいるため、実行時に
// 外部へ取りに行かない（現地でオフライン気味の回線でも動く）。

import { heicTo, isHeic } from 'heic-to'

/**
 * HEIC/HEIFであればJPEGに変換したFileを返す。それ以外はそのまま返す。
 * 判定・変換のどちらかが失敗しても例外は投げず、元のファイルにフォールバックする
 * （写真1枚の変換失敗のせいで、選択自体ができなくなるのを避けるため）。
 */
export async function toDisplayableImage(file: File): Promise<File> {
  let heic: boolean
  try {
    heic = await isHeic(file)
  } catch {
    return file
  }
  if (!heic) return file

  try {
    const converted = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.85 })
    const name = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([converted], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
