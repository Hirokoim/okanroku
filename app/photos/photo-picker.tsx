'use client'

// 記録フォームの「写真」欄の見た目だけを受け持つ。
// 状態は use-photo-entries.ts が持ち、ここは受け取って表示し、
// 操作されたら親へ伝えるだけ。

import { useState } from 'react'
import { LocationSearchField } from '../location-search-field'
import type { GeocodeResult } from '../api/geocode/route'
import type { PhotoEntry } from './use-photo-entries'

function ExifBadge({ photo }: { photo: PhotoEntry }) {
  if (photo.loadingExif) {
    return <div className="text-nami-dim">座標を確認中...</div>
  }
  if (photo.fromExif) {
    return (
      <span className="inline-block bg-ai-deep text-kin text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
        EXIF自動取得
      </span>
    )
  }
  return (
    <span className="inline-block bg-sumi-3 text-nami-dim text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
      GPS情報なし
    </span>
  )
}

export function PhotoPicker({
  photos,
  maxPhotos,
  onAdd,
  onRemove,
  onCoordinateChange,
  onUseCurrentLocation,
  pendingLocation,
  onSetPendingLocation,
}: {
  photos: PhotoEntry[]
  maxPhotos: number
  onAdd: (files: FileList | null) => void
  onRemove: (key: string) => void
  onCoordinateChange: (key: string, field: 'latitude' | 'longitude', value: string) => void
  onUseCurrentLocation: (key: string) => void
  /** 写真を選ぶ前に地点検索で決めておいた座標。次に追加する写真の初期値に使う。
   *  一括取り込み（写真ごとに別地点になりうる）では使わないため任意。 */
  pendingLocation?: { latitude: number; longitude: number } | null
  onSetPendingLocation?: (location: { latitude: number; longitude: number } | null) => void
}) {
  // どの写真の「地点を検索」を開いているか。一度に1枚ぶんだけでよいため
  // key1つだけ持つ（複数同時に開くと画面が縦に伸びすぎるため）。
  const [searchingKey, setSearchingKey] = useState<string | null>(null)
  const [showPreSearch, setShowPreSearch] = useState(false)

  return (
    <div>
      <label className="block text-sm mb-1">
        写真{' '}
        {photos.length > 0 ? (
          <span className="text-xs font-medium text-matsu">
            {photos.length}枚を添付中（保存はまだです）
          </span>
        ) : (
          <span className="text-nami-dim text-xs">最大{maxPhotos}枚</span>
        )}
      </label>

      {/* 写真を選ぶ前に地点だけ先に決めたい場合の入口。
          写真ごとの「地点を検索して設定」ボタンは写真が無いと存在しないため、
          「案内文にはあるのにボタンが無い」状態を避けるために別枠で用意する。 */}
      {onSetPendingLocation && photos.length === 0 && (
        <div className="mb-2">
          {pendingLocation ? (
            <div className="flex items-center gap-2 text-xs border border-kin-dim rounded-lg px-3 py-2 bg-sumi-2 text-kin">
              <span>地点を設定しました（次に追加する写真から使われます）</span>
              <button
                type="button"
                onClick={() => onSetPendingLocation(null)}
                className="ml-auto text-nami-dim underline"
              >
                取り消す
              </button>
            </div>
          ) : showPreSearch ? (
            <LocationSearchField
              onSelect={(r: GeocodeResult) => {
                onSetPendingLocation({ latitude: r.latitude, longitude: r.longitude })
                setShowPreSearch(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowPreSearch(true)}
              className="w-full border border-dashed border-kin-dim rounded-lg py-2 text-sm text-kin"
            >
              写真を選ぶ前に地点を検索する
            </button>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 mb-2">
          {photos.map((photo) => (
            <li key={photo.key} className="border border-line rounded-lg p-2 text-xs space-y-1 bg-sumi-3">
              {photo.convertingHeic ? (
                // HEIC→JPEG変換の完了待ち。変換前のプレビューはブラウザによって
                // 壊れた画像に見えるため、終わるまでこちらを出す。
                <div className="w-full aspect-[4/3] rounded bg-sumi-2 grid place-items-center text-nami-dim text-[11px]">
                  写真を変換中...
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- ローカルのobject URLのためnext/imageは使わない
                <img src={photo.previewUrl} alt="" className="w-full aspect-[4/3] object-cover rounded" />
              )}

              <ExifBadge photo={photo} />

              <div className="grid grid-cols-2 gap-1">
                <input
                  type="number"
                  step="any"
                  placeholder="緯度"
                  aria-label="緯度"
                  value={photo.latitude}
                  onChange={(e) => onCoordinateChange(photo.key, 'latitude', e.target.value)}
                  className="border border-line rounded p-1 w-full bg-sumi-2 text-nami"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="経度"
                  aria-label="経度"
                  value={photo.longitude}
                  onChange={(e) => onCoordinateChange(photo.key, 'longitude', e.target.value)}
                  className="border border-line rounded p-1 w-full bg-sumi-2 text-nami"
                />
              </div>

              {!photo.loadingExif && !photo.fromExif && (
                <button
                  type="button"
                  onClick={() => onUseCurrentLocation(photo.key)}
                  className="w-full border border-dashed border-line rounded py-1 text-nami-dim"
                >
                  現在地を使う
                </button>
              )}

              <button
                type="button"
                onClick={() => setSearchingKey((k) => (k === photo.key ? null : photo.key))}
                className="w-full border border-dashed border-kin-dim rounded py-1 text-kin"
              >
                {searchingKey === photo.key ? '地点検索を閉じる' : '地点を検索して設定'}
              </button>
              {searchingKey === photo.key && (
                <LocationSearchField
                  onSelect={(r) => {
                    onCoordinateChange(photo.key, 'latitude', String(r.latitude))
                    onCoordinateChange(photo.key, 'longitude', String(r.longitude))
                    setSearchingKey(null)
                  }}
                />
              )}

              <button type="button" onClick={() => onRemove(photo.key)} className="text-hi-bright text-xs">
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {photos.length < maxPhotos && (
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-kin-dim rounded-lg py-6 text-center bg-sumi-3 hover:bg-sumi-2 hover:border-kin active:bg-sumi transition-colors cursor-pointer">
          <span className="text-2xl leading-none text-kin" aria-hidden="true">
            ＋
          </span>
          <span className="text-sm font-medium text-kin">
            {photos.length > 0 ? '写真を追加する' : '写真を選ぶ・撮る'}
          </span>
          <span className="text-xs text-nami-dim">タップしてカメラロールを開く</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              onAdd(e.target.files)
              e.target.value = ''
            }}
            className="hidden"
          />
        </label>
      )}

      <p className="text-xs text-nami-dim mt-1">
        写真にGPS情報があれば自動で座標を読み取ります。無ければ「現在地を使う」か「地点を検索して設定」で指定してください。空欄のままでも保存できます。
      </p>
    </div>
  )
}
