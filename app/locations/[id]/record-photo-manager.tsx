// 記録編集フォームの写真グリッド・追加・位置修正モーダル。EditRecordFormが使う。

import { LocationSearchField } from '../../location-search-field'
import type { RecordPhoto } from './record-types'
import { MAX_PHOTOS } from './use-record-photos'

export function RecordPhotoManager({
  photos,
  adding,
  error,
  locatingPhotoId,
  onSetLocatingPhotoId,
  onAddPhotos,
  onUpdateLocation,
  onRemove,
}: {
  photos: RecordPhoto[]
  adding: boolean
  error: string | null
  locatingPhotoId: string | null
  onSetLocatingPhotoId: (id: string | null) => void
  onAddPhotos: (files: FileList | null) => void
  onUpdateLocation: (photoId: string, latitude: number, longitude: number) => void
  onRemove: (photoId: string, storagePath: string) => void
}) {
  return (
    <div className="border-t border-line pt-3 space-y-2">
      <div className="text-[11px] font-semibold tracking-wide text-kin-dim uppercase">
        写真（{photos.length}/{MAX_PHOTOS}枚）
      </div>
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative">
              {photo.unsupportedFormat ? (
                <div className="w-full aspect-[4/3] rounded border border-line bg-sumi-2 grid place-items-center text-nami-dim text-[10px] text-center px-1">
                  HEIC形式のため表示不可
                </div>
              ) : photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- 署名URLのためnext/imageは使わない
                <img src={photo.url} alt="" className="w-full aspect-[4/3] object-cover rounded border border-line" />
              ) : (
                <div className="w-full aspect-[4/3] rounded border border-line bg-sumi-2 grid place-items-center text-nami-dim text-[10px]">
                  読み込めません
                </div>
              )}
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => onSetLocatingPhotoId(locatingPhotoId === photo.id ? null : photo.id)}
                  className="bg-sumi/90 border border-line rounded px-1.5 text-[10px] text-kin"
                  aria-label={`この写真の位置を修正（${photo.latitude !== null ? '現在地あり' : '位置情報なし'}）`}
                >
                  位置
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(photo.id, photo.storage_path)}
                  className="bg-sumi/90 border border-line rounded px-1.5 text-[10px] text-hi-bright"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {locatingPhotoId && (
        <div className="border border-line rounded-lg p-3 bg-sumi-2 space-y-2">
          <p className="text-xs text-nami-dim">
            地名・住所で検索して、この写真の位置を設定します（手入力よりかんたんです）。
          </p>
          <LocationSearchField
            onSelect={(r) => {
              onUpdateLocation(locatingPhotoId, r.latitude, r.longitude)
              onSetLocatingPhotoId(null)
            }}
          />
          <button
            type="button"
            onClick={() => onSetLocatingPhotoId(null)}
            className="text-xs text-nami-dim underline"
          >
            キャンセル
          </button>
        </div>
      )}
      {photos.length < MAX_PHOTOS && (
        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-kin-dim rounded-lg py-3 text-center bg-sumi-2 hover:bg-sumi active:bg-sumi hover:border-kin transition-colors cursor-pointer">
          <span className="text-lg leading-none text-kin" aria-hidden="true">
            ＋
          </span>
          <span className="text-sm font-medium text-kin">{adding ? '追加中...' : '写真を追加する'}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={adding}
            className="hidden"
            onChange={(e) => {
              onAddPhotos(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      )}
      {error && <p className="text-hi-bright text-xs"><span aria-hidden="true">⚠ </span>{error}</p>}
    </div>
  )
}
