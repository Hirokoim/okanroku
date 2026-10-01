// 地図タブ（/map）の表示状態をURLに載せるための共通処理。
// 「作品一覧を表示中」「クラスタで絞り込み中」を画面の中だけで持つと、地点詳細へ進んで
// 戻ったとき（リンクでもブラウザの戻るでも）に状態が消えてしまうため、URLに残す。
//
//   /map?cluster=遠江・山中&view=gallery
//
// 地点詳細へのリンクにも同じ2つを付けておき、地点詳細の「戻る」は来た状態の/mapへ戻る。

export type MapViewMode = 'map' | 'gallery'

export function parseMapView(value: string | null | undefined): MapViewMode {
  return value === 'gallery' ? 'gallery' : 'map'
}

function query(cluster: string | null, view: MapViewMode): string {
  const params = new URLSearchParams()
  if (cluster) params.set('cluster', cluster)
  if (view === 'gallery') params.set('view', 'gallery')
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function mapHref(cluster: string | null, view: MapViewMode): string {
  return `/map${query(cluster, view)}`
}

/** 地図タブから地点詳細へ進むリンク。戻り先を復元できるよう、今の表示状態を付けて渡す */
export function locationHref(locationId: string, cluster: string | null, view: MapViewMode): string {
  return `/locations/${locationId}${query(cluster, view)}`
}
