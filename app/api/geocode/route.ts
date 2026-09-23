// 地点検索（地名・住所→緯度経度）専用のAPIルート。
//
// 写真の緯度・経度を手入力する代わりに、Googleマップのように地名で検索できる
// ようにするためのもの（アクセシビリティ改善の一環）。
// weather/route.tsと同じ理由で「ブラウザから外部APIを直接叩かない」構成にし、
// あわせてNominatim（OpenStreetMap）の利用ポリシーが求める識別可能な
// User-Agentをサーバー側からだけ付ける。

import { NextRequest, NextResponse } from 'next/server'

const FETCH_TIMEOUT_MS = 5000
const MAX_RESULTS = 5
const MAX_QUERY_LENGTH = 100
const USER_AGENT = 'okanroku-app/1.0 (travel record app; https://github.com/Hirokoim/okanroku)'

export type GeocodeResult = {
  label: string
  latitude: number
  longitude: number
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'invalid input' }, { status: 400 })
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${MAX_RESULTS}&accept-language=ja&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Nominatim負荷軽減のため、同一クエリを24時間キャッシュ（必要に応じて調整）
      cache: 'force-cache',
      next: { revalidate: 86400 },
    })

    if (!res.ok) throw new Error(`geocode api responded ${res.status}`)
    const data = await res.json()

    const results: GeocodeResult[] = (Array.isArray(data) ? data : [])
      .map((item) => ({
        label: String(item.display_name ?? ''),
        latitude: Number(item.lat),
        longitude: Number(item.lon),
      }))
      .filter((r) => r.label && Number.isFinite(r.latitude) && Number.isFinite(r.longitude))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[Geocode API Error]:', error)
    return NextResponse.json({ error: 'geocode fetch failed' }, { status: 502 })
  }
}
