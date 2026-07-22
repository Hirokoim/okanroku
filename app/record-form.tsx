'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadPhoto } from '@/lib/storage'

type Figure = { id: string; name: string }

export function RecordForm({ userId, figures }: { userId: string; figures: Figure[] }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
        longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
        // datetime-localはタイムゾーン情報を持たないため、端末のローカル時刻として解釈して保存する
        photographed_at: photographedAtRaw ? new Date(photographedAtRaw).toISOString() : null,
        diff_type: formData.get('diff_type') || null,
        access_note: formData.get('access_note') || null,
        voice_transcript: formData.get('voice_transcript') || null,
        edit_intent: formData.get('edit_intent') || null,
        photo_urls: photoUrls,
      })

      if (insertError) throw insertError

      form.reset()
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

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          緯度
          <input name="latitude" type="number" step="any" className="w-full border rounded p-2 mt-1" />
        </label>
        <label className="block text-sm">
          経度
          <input name="longitude" type="number" step="any" className="w-full border rounded p-2 mt-1" />
        </label>
      </div>

      <label className="block text-sm">
        撮影日時
        <input name="photographed_at" type="datetime-local" className="w-full border rounded p-2 mt-1" />
      </label>

      <label className="block text-sm">
        当時と現在の差分
        <select name="diff_type" className="w-full border rounded p-2 mt-1">
          <option value="">未選択</option>
          <option value="unchanged">変わらない</option>
          <option value="changed">変わった</option>
          <option value="lost">消失</option>
        </select>
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
