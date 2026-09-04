import { NextRequest, NextResponse } from 'next/server'

// 地名検索から緯度経度を引く、OpenStreetMapのNominatim（無料・APIキー不要）への中継。
//
// ブラウザから直接叩くとUser-Agentを指定できず、Nominatimの利用規約
// （https://operations.osmfoundation.org/policies/nominatim/）が求める
// 「アプリケーションを識別できるUser-Agent」を満たせないため、サーバー側から呼び出す。
// 検索は記録フォームの「地点を検索」ボタン押下時のみに限り、入力のたびに叩かない
// （同規約の低頻度アクセスの要請に沿う）。

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length > 200) {
    return NextResponse.json({ error: '検索キーワードを入力してください' }, { status: 400 })
  }

  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'jp')
  url.searchParams.set('q', q)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'okanroku-app (https://github.com/Hirokoim/okanroku)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`status ${res.status}`)

    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>
    return NextResponse.json({
      results: data.map((d) => ({
        name: d.display_name,
        latitude: Number(d.lat),
        longitude: Number(d.lon),
      })),
    })
  } catch {
    // 主機能（記録の手入力保存）は道連れにしない。検索失敗時も手入力・現在地で続行できる。
    return NextResponse.json(
      { error: '検索に失敗しました。手入力するか「現在地を使う」をお試しください' },
      { status: 502 }
    )
  }
}
