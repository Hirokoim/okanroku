'use client'

// 選んだ写真を記録（records）に紐づけて保存する処理。
//
// 地点詳細の記録フォーム（record-form.tsx）と一括取り込み（import-form.tsx）に
// 同じループが二重に書かれていたため、ここに集約した。どちらも「recordsの行を
// 先に作り、そのidに対して写真を順に保存する」という同じ流れになっている。

import { uploadPhoto } from '@/lib/storage'
import type { createClient } from '@/lib/supabase/client'
import type { PhotoEntry } from './use-photo-entries'

type SupabaseClient = ReturnType<typeof createClient>

/**
 * 写真を1枚ずつStorageへ上げ、record_photosの行を作る。
 *
 * 並列化していないのは意図的。HEIC変換済みとはいえ写真は1枚が大きく、
 * 携帯で複数枚を同時に処理するとメモリを圧迫するため、順番に処理する。
 *
 * 途中で失敗した場合はその時点で例外を投げる（それまでに保存できた分は残る）。
 * 呼び出し側で握りつぶさず、利用者にエラーを見せること。
 */
export async function saveRecordPhotos(
  supabase: SupabaseClient,
  recordId: string,
  userId: string,
  photos: PhotoEntry[]
): Promise<void> {
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const storagePath = await uploadPhoto(photo.file, userId)
    const { error } = await supabase.from('record_photos').insert({
      record_id: recordId,
      storage_path: storagePath,
      latitude: photo.latitude ? Number(photo.latitude) : null,
      longitude: photo.longitude ? Number(photo.longitude) : null,
      // datetime-localはタイムゾーン情報を持たないため、端末のローカル時刻として解釈する
      taken_at: photo.takenAt ? new Date(photo.takenAt).toISOString() : null,
      sort_order: i,
    })
    if (error) throw error
  }
}
