import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { newId } from '@/lib/id'

const BUCKET = 'photos'

// 署名付きURLの有効期間。表示のたびに発行し直すので短くてよい。
const SIGNED_URL_TTL_SECONDS = 60 * 60

// 写真をアップロードし、record_photosテーブルに保存する「パス」を返す。
// バケットは非公開なので、パスだけではブラウザから直接見ることはできない。
export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${newId()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error

  return path
}

/**
 * 保存されたパスから、表示用の一時URLをまとめて発行する。
 *
 * 1枚ずつ発行すると枚数分の往復が発生するため、まとめて1回で取る。
 * supabaseクライアントを引数で受け取るのは、サーバー側（地点詳細ページ）と
 * ブラウザ側のどちらからでも使えるようにするため。
 *
 * 発行に失敗した写真は、戻り値のMapに入らない。表示側は「URLが無い写真」を
 * 読み込めなかったものとして扱う。ここで例外にすると、写真1枚のせいで
 * 記録本体まで表示できなくなるため。
 */
export async function createPhotoUrls(
  supabase: SupabaseClient,
  paths: string[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  const uniquePaths = [...new Set(paths)]
  if (uniquePaths.length === 0) return urls

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error('写真の署名付きURLを発行できませんでした', error)
    return urls
  }

  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl)
    }
  }
  return urls
}
