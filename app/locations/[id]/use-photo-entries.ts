'use client'

// 記録フォームに添付する写真の「状態」だけを受け持つ。
// 画面の見た目は photo-picker.tsx、保存処理は record-form.tsx が担当する。
//
// 写真1枚につき、ファイル本体・プレビュー・座標・撮影日時を1組で持ち回る必要が
// あり、追加／EXIF読み取り／現在地の反映／削除／後片付けと出入りが多いため、
// フォーム本体から切り出している。

import { useEffect, useRef, useState } from 'react'
import { newId } from '@/lib/id'
import { readExif } from '@/lib/exif'

export const MAX_PHOTOS = 5

export type PhotoEntry = {
  key: string
  file: File
  previewUrl: string
  latitude: string
  longitude: string
  takenAt: string // datetime-local入力用（ISOではなくローカル文字列）
  loadingExif: boolean
  fromExif: boolean
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function newPhotoEntry(file: File): PhotoEntry {
  return {
    key: newId(),
    file,
    previewUrl: URL.createObjectURL(file),
    latitude: '',
    longitude: '',
    takenAt: '',
    loadingExif: true,
    fromExif: false,
  }
}

export function usePhotoEntries(onError: (message: string) => void) {
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  // プレビュー用のobject URLは、明示的に解放しないとページを離れても残り続ける。
  // 最新のphotosをrefに写しておき、片付けの時に読む（photosを依存に入れると、
  // 写真を1枚足すたびに解放が走ってしまうため）。
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, [])

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return

    const room = MAX_PHOTOS - photos.length
    if (room <= 0) return

    try {
      // input.files が返す FileList は「生きた」オブジェクトで、直後に input.value = '' で
      // 選択を解除すると同じオブジェクトの中身が空になる。setStateの更新関数は遅延実行される
      // ため、その中で FileList を読むと空になった後を見てしまい、写真が1枚も追加されない
      // （エラーも出ないので気づけない）。ここで同期的に配列へ写しきってから state に渡す。
      const added = Array.from(files).slice(0, room).map(newPhotoEntry)
      setPhotos((prev) => [...prev, ...added])

      // EXIF解析は1枚ごとに非同期で行い、終わったものから順にサムネイルの
      // バッジ・座標欄を更新する（全枚数を待って一括表示しない。枚数が多いと
      // 「何も起きていないように見える」時間が伸びるため）。
      for (const entry of added) {
        readExif(entry.file).then((result) => {
          setPhotos((prev) =>
            prev.map((p) =>
              p.key === entry.key
                ? {
                    ...p,
                    loadingExif: false,
                    fromExif: result.latitude !== null && result.longitude !== null,
                    latitude: result.latitude !== null ? String(result.latitude) : p.latitude,
                    longitude: result.longitude !== null ? String(result.longitude) : p.longitude,
                    takenAt: result.takenAt ? isoToLocalInput(result.takenAt) : p.takenAt,
                  }
                : p
            )
          )
        })
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : '写真の読み込みに失敗しました')
    }
  }

  function applyCurrentLocation(key: string) {
    if (!('geolocation' in navigator)) {
      onError('この端末・ブラウザでは現在地を取得できません')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPhotos((prev) =>
          prev.map((p) =>
            p.key === key
              ? { ...p, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }
              : p
          )
        )
      },
      () => onError('現在地の取得を許可されなかったか、取得に失敗しました。手入力してください。'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.key !== key)
    })
  }

  function updateCoordinate(key: string, field: 'latitude' | 'longitude', value: string) {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, [field]: value } : p)))
  }

  /** 保存に成功したあと、添付をすべて解放して空にする */
  function clearPhotos() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
  }

  return { photos, addPhotos, applyCurrentLocation, removePhoto, updateCoordinate, clearPhotos }
}
