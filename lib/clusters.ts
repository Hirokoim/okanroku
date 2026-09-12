// クラスタ（docs/clusters.mdの「その日1日で往還できる単位」）ごとの
// 進捗集計。locations.cluster と、ユーザーが記録済みのlocation_idの集合から
// 導出するだけで、専用テーブルは持たない（5-Eで決めた「クラスタ専用テーブルは
// 作らない」方針の延長）。

export type ClusterLocation = {
  id: string
  number: number
  title_jp: string
  cluster: string | null
  latitude: number | null
  longitude: number | null
}

/** クラスタに属する地点1件。開拓マップの吹き出しから地点詳細へ飛ぶために持つ */
export type ClusterLocationSummary = {
  id: string
  number: number
  title_jp: string
  visited: boolean
}

export type ClusterStatus = 'complete' | 'partial' | 'none'

export type ClusterSummary = {
  name: string
  total: number
  visited: number
  maxKm: number | null
  status: ClusterStatus
  centroid: { latitude: number; longitude: number } | null
  locations: ClusterLocationSummary[]
}

// 2地点間の距離（km）。docs/clusters.mdの「最大◯km」と同じ考え方
// （行政区画ではなく実際の地点間距離）をそのままlatitude/longitudeから計算する。
// シードSQLの46地点で検証したところ、28クラスタすべてドキュメントの数値と
// 小数第1位まで一致した。
export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 江戸（日本橋）からの距離が近い順にクラスタを並べる。
// 「次はどこを目指しますか」に答える画面なので、近い行き先から並ぶほうが選びやすい。
//
// docs/clusters.mdの並び（令制国ごとのまとまり）とは一致しない。実データで確認した
// ところ、下総・登戸（市川市。日本橋から約15km）が9番目、常陸・牛堀が15番目に来て、
// 国のまとまりは崩れる。まとまり順で出したい場合は、ここを手作業の並び順テーブルに
// 差し替える必要がある。
const EDO = { latitude: 35.6812, longitude: 139.7671 }

export function buildClusterSummaries(
  locations: ClusterLocation[],
  visitedIds: Set<string>
): ClusterSummary[] {
  const byCluster = new Map<string, ClusterLocation[]>()
  for (const loc of locations) {
    if (!loc.cluster) continue
    const list = byCluster.get(loc.cluster) ?? []
    list.push(loc)
    byCluster.set(loc.cluster, list)
  }

  const summaries: (ClusterSummary & { distanceFromEdo: number })[] = []
  for (const [name, locs] of byCluster) {
    const withCoords = locs.filter(
      (l): l is ClusterLocation & { latitude: number; longitude: number } =>
        l.latitude !== null && l.longitude !== null
    )

    let maxKm: number | null = null
    for (let i = 0; i < withCoords.length; i++) {
      for (let j = i + 1; j < withCoords.length; j++) {
        const km = haversineKm(withCoords[i], withCoords[j])
        if (maxKm === null || km > maxKm) maxKm = km
      }
    }

    const visited = locs.filter((l) => visitedIds.has(l.id)).length
    const total = locs.length

    const centroid =
      withCoords.length > 0
        ? {
            latitude: withCoords.reduce((s, l) => s + l.latitude, 0) / withCoords.length,
            longitude: withCoords.reduce((s, l) => s + l.longitude, 0) / withCoords.length,
          }
        : null

    summaries.push({
      name,
      total,
      visited,
      maxKm,
      status: visited === 0 ? 'none' : visited === total ? 'complete' : 'partial',
      centroid,
      // 図の番号順。クラスタ内の巡回順（route_order）はここでは引いていないため、
      // 吹き出しでの並びは番号順に揃える
      locations: [...locs]
        .sort((a, b) => a.number - b.number)
        .map((l) => ({
          id: l.id,
          number: l.number,
          title_jp: l.title_jp,
          visited: visitedIds.has(l.id),
        })),
      distanceFromEdo: centroid ? haversineKm(EDO, centroid) : Infinity,
    })
  }

  return summaries.sort((a, b) => a.distanceFromEdo - b.distanceFromEdo)
}
