'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'

type Figure = { id: string; name: string }
type GeocodeResult = { name: string; latitude: number; longitude: number }

export function RecordForm({ userId, figures }: { userId: string; figures: Figure[] }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 緯度経度：手入力に加えて「現在地を使う」「地点名で検索」でも埋められるよう、
  // このフィールドだけ制御コンポーネントにする（他の項目はFormDataのまま）。
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([])

  function handleUseCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setLocateError('この端末・ブラウザは位置情報に対応していません')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude))
        setLongitude(String(pos.coords.longitude))
        setLocating(false)
      },
      (err) => {
        setLocateError(err.message || '現在地を取得できませんでした')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function handleSearch() {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    setSearchResults([])
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '検索に失敗しました')
      setSearchResults(data.results)
      if (data.results.length === 0) setSearchError('見つかりませんでした。キーワードを変えてお試しください')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : '検索に失敗しました')
    } finally {
      setSearching(false)
    }
  }

  function handlePickResult(result: GeocodeResult) {
    setLatitude(String(result.latitude))
    setLongitude(String(result.longitude))
    setSearchResults([])
    setSearchQuery(result.name)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const photoFile = formData.get('photo') as File

    try {
      const photoUrls: string[] = []
      if (photoFile && photoFile.size > 0) {
        const path = await uploadPhoto(photoFile, userId)
        photoUrls.push(path)
      }

      const photographedAtRaw = formData.get('photographed_at') as string

      const supabase = createClient()
      const { error: insertError } = await supabase.from('records').insert({
        user_id: userId,
        figure_id: formData.get('figure_id'),
        location_name: formData.get('location_name'),
        work_label: formData.get('work_label') || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        // datetime-localはタイムゾーン情報を持たないため、端末のローカル時刻として解釈して保存する
        photographed_at: photographedAtRaw ? new Date(photographedAtRaw).toISOString() : null,
        access_note: formData.get('access_note') || null,
        voice_transcript: formData.get('voice_transcript') || null,
        edit_intent: formData.get('edit_intent') || null,
        photo_urls: photoUrls,
      })

      if (insertError) throw insertError

      form.reset()
      setLatitude('')
      setLongitude('')
      setSearchQuery('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4">
      <h2 className="font-semibold">新しい記録</h2>

      <label className="block text-sm">
        人物
        <select name="figure_id" required className="w-full border rounded p-2 mt-1">
          {figures.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        地点名
        <input name="location_name" required className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        作品番号／作品名
        <input name="work_label" className="w-full border rounded p-2 mt-1" />
      </label>

      <div className="space-y-2 border rounded p-3">
        <div className="text-sm font-medium">緯度・経度</div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-50"
          >
            📍 {locating ? '取得中...' : '現在地を使う'}
          </button>
        </div>
        {locateError && <p className="text-xs text-red-600">{locateError}</p>}

        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder="地点名・住所で検索（例：富士市 田子の浦）"
            className="flex-1 border rounded p-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-50 shrink-0"
          >
            🔍 {searching ? '検索中...' : '検索'}
          </button>
        </div>
        {searchError && <p className="text-xs text-red-600">{searchError}</p>}
        {searchResults.length > 0 && (
          <ul className="border rounded divide-y">
            {searchResults.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handlePickResult(r)}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50"
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            緯度
            <input
              name="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full border rounded p-2 mt-1"
            />
          </label>
          <label className="block text-sm">
            経度
            <input
              name="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full border rounded p-2 mt-1"
            />
          </label>
        </div>
      </div>

      <label className="block text-sm">
        撮影日時
        <input name="photographed_at" type="datetime-local" className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        アクセス情報
        <textarea name="access_note" className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        音声メモの文字起こし
        <textarea name="voice_transcript" className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        編集意図（1行）
        <input name="edit_intent" className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        写真
        <input name="photo" type="file" accept="image/*" className="w-full mt-1" />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {submitting ? '保存中...' : '保存する'}
      </button>
    </form>
  )
}
