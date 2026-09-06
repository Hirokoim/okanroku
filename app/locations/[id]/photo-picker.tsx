'use client'

// 記録フォームの「写真」欄の見た目だけを受け持つ。
// 状態は use-photo-entries.ts が持ち、ここは受け取って表示し、
// 操作されたら親へ伝えるだけ。

import { MAX_PHOTOS, type PhotoEntry } from './use-photo-entries'

function ExifBadge({ photo }: { photo: PhotoEntry }) {
  if (photo.loadingExif) {
    return <div className="text-gray-400">座標を確認中...</div>
  }
  if (photo.fromExif) {
    return (
      <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
        EXIF自動取得
      </span>
    )
  }
  return (
    <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
      GPS情報なし
    </span>
  )
}

export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  onCoordinateChange,
  onUseCurrentLocation,
}: {
  photos: PhotoEntry[]
  onAdd: (files: FileList | null) => void
  onRemove: (key: string) => void
  onCoordinateChange: (key: string, field: 'latitude' | 'longitude', value: string) => void
  onUseCurrentLocation: (key: string) => void
}) {
  return (
    <div>
      <label className="block text-sm mb-1">
        写真{' '}
        {photos.length > 0 ? (
          <span className="text-xs font-medium text-green-700">
            {photos.length}枚を添付中（保存はまだです）
          </span>
        ) : (
          <span className="text-gray-400 text-xs">最大{MAX_PHOTOS}枚</span>
        )}
      </label>

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 mb-2">
          {photos.map((photo) => (
            <li key={photo.key} className="border rounded-lg p-2 text-xs space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- ローカルのobject URLのためnext/imageは使わない */}
              <img src={photo.previewUrl} alt="" className="w-full aspect-[4/3] object-cover rounded" />

              <ExifBadge photo={photo} />

              <div className="grid grid-cols-2 gap-1">
                <input
                  type="number"
                  step="any"
                  placeholder="緯度"
                  value={photo.latitude}
                  onChange={(e) => onCoordinateChange(photo.key, 'latitude', e.target.value)}
                  className="border rounded p-1 w-full"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="経度"
                  value={photo.longitude}
                  onChange={(e) => onCoordinateChange(photo.key, 'longitude', e.target.value)}
                  className="border rounded p-1 w-full"
                />
              </div>

              {!photo.loadingExif && !photo.fromExif && (
                <button
                  type="button"
                  onClick={() => onUseCurrentLocation(photo.key)}
                  className="w-full border border-dashed rounded py-1 text-gray-500"
                >
                  現在地を使う
                </button>
              )}

              <button type="button" onClick={() => onRemove(photo.key)} className="text-red-600 text-xs">
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {photos.length < MAX_PHOTOS && (
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            onAdd(e.target.files)
            e.target.value = ''
          }}
          className="w-full text-sm"
        />
      )}

      <p className="text-xs text-gray-400 mt-1">
        写真にGPS情報があれば自動で座標を読み取ります。無ければ「現在地を使う」か手入力してください。空欄のままでも保存できます。
      </p>
    </div>
  )
}
