// 記録編集フォームの写真操作ロジック（追加・削除・位置修正）。
// EditRecordForm/RecordPhotoManagerが使う。

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'
import { readExif } from '@/lib/exif'
import { toDisplayableImage } from '@/lib/heic'
import type { RecordPhoto } from './record-types'

export const MAX_PHOTOS = 5

export function useRecordPhotos(recordId: string, userId: string, photos: RecordPhoto[]) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // どの写真の「位置を修正」検索を開いているか（1枚ぶんだけ）
  const [locatingPhotoId, setLocatingPhotoId] = useState<string | null>(null)

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const room = MAX_PHOTOS - photos.length
    if (room <= 0) {
      setError(`写真は最大${MAX_PHOTOS}枚までです`)
      return
    }

    setAdding(true)
    const supabase = createClient()

    try {
      const toAdd = Array.from(files).slice(0, room)
      for (let i = 0; i < toAdd.length; i++) {
        const original = toAdd[i]
        const exif = await readExif(original)
        const displayable = await toDisplayableImage(original)
        const storagePath = await uploadPhoto(displayable, userId)
        const { error: insertError } = await supabase.from('record_photos').insert({
          record_id: recordId,
          storage_path: storagePath,
          latitude: exif.latitude,
          longitude: exif.longitude,
          taken_at: exif.takenAt,
          sort_order: photos.length + i,
        })
        if (insertError) throw insertError
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '写真の追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  // 保存済みの写真の座標を、地点検索の結果で上書きする。
  // GPS情報が無い写真や、間違った座標で保存されてしまった写真を、あとから
  // 地名検索で直せるようにするためのもの（緯度経度の手入力は負担が大きいため）。
  async function updateLocation(photoId: string, latitude: number, longitude: number) {
    setError(null)
    const supabase = createClient()
    try {
      const { error: updateError } = await supabase
        .from('record_photos')
        .update({ latitude, longitude })
        .eq('id', photoId)
      if (updateError) throw updateError
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '位置情報の更新に失敗しました')
    }
  }

  async function remove(photoId: string, storagePath: string) {
    setError(null)
    const supabase = createClient()

    try {
      const { error: deleteError } = await supabase.from('record_photos').delete().eq('id', photoId)
      if (deleteError) throw deleteError
      // Storage側のファイル本体も削除を試みる。行の削除自体は上で完了しているため、
      // ここが失敗しても記録上は「削除済み」として扱うが、原因調査のため画面には出す。
      const { error: storageError } = await supabase.storage.from('photos').remove([storagePath])
      if (storageError) {
        console.error('写真ファイルの削除に失敗しました', storageError)
        setError(`写真の行は削除しましたが、ファイル本体の削除に失敗しました：${storageError.message}`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '写真の削除に失敗しました')
    }
  }

  return {
    adding,
    error,
    locatingPhotoId,
    setLocatingPhotoId,
    addPhotos,
    updateLocation,
    remove,
  }
}
