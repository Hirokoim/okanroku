import { createClient } from '@/lib/supabase/client'

const BUCKET = 'photos'

// 写真をアップロードし、recordsテーブルに保存する「パス」を返す
export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw error

  return path
}

// 保存されたパスから、表示用の一時URL（1時間有効）を発行する
export async function getPhotoUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60)

  if (error) throw error
  return data.signedUrl
}
