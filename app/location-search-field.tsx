'use client'

// 地名・住所で検索し、緯度経度を選べる入力欄。/api/geocode（Nominatim）を叩く。
// 写真の座標を手入力する代わりに使う（photo-picker.tsx・edit-record-form.tsxで共用）。

import { useEffect, useRef, useState } from 'react'
import type { GeocodeResult } from './api/geocode/route'

const DEBOUNCE_MS = 500
const MIN_QUERY_LENGTH = 2

export function LocationSearchField({
  onSelect,
  placeholder = '地名・住所で検索…',
}: {
  onSelect: (result: GeocodeResult) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LENGTH) {
      // 短すぎる入力（1文字だけ等）で前回の検索結果を出しっぱなしにしないための
      // 同期的なクリア。record-form.tsxのlocalStorage読み込みと同じ理由で抑止する。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setError(null)
      return
    }

    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        // 入力中に前のリクエストが後から返ってきて結果を上書きしないよう、
        // 最新のリクエストかどうかを確認する。
        if (requestId !== requestIdRef.current) return
        if (!res.ok) throw new Error(data?.error ?? 'search failed')
        setResults(data.results ?? [])
      } catch {
        if (requestId !== requestIdRef.current) return
        setError('検索に失敗しました。通信状態を確認してください。')
        setResults([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="地名・住所で検索"
        className="w-full border border-line rounded p-1.5 text-sm bg-sumi-2 text-nami placeholder:text-nami-dim"
      />

      {loading && <p className="text-xs text-nami-dim mt-1">検索中...</p>}
      {error && <p className="text-xs text-hi-bright mt-1"><span aria-hidden="true">⚠ </span>{error}</p>}

      {results.length > 0 && (
        <ul className="mt-1 border border-line rounded-lg overflow-hidden divide-y divide-line">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r)
                  setQuery('')
                  setResults([])
                }}
                className="w-full text-left px-2 py-1.5 text-xs bg-sumi-3 hover:bg-sumi-4 transition-colors"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
