// クラスタ（docs/clusters.mdの「その日1日で往還できる単位」）ごとの
// 進捗集計。locations.cluster と、ユーザーが記録済みのlocation_idの集合から
// 導出するだけで、専用テーブルは持たない（5-Eで決めた「クラスタ専用テーブルは
// 作らない」方針の延長）。

export type ClusterLocation = {
  cluster: string | null
  latitude: number | null
  longitude: number | null
}

export type ClusterSummary = {
  name: string
  total: number
  visited: number
  maxKm: number | null
  status: 'complete' | 'partial' | 'none'
}

// 2地点間の距離（km）。docs/clusters.mdの「最大◯km」と同じ考え方
// （行政区画ではなく実際の地点間距離）をそのままlatitude/longitudeから計算する。
function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 江戸（日本橋）からの距離でクラスタを並べる。docs/clusters.mdの並び順
// （江戸→武蔵→相模→富士→甲斐→駿河…と、令制国の近い順）を、
// 手作業の並び替えテーブルを持たずに再現するための代用値。
const EDO = { latitude: 35.6812, longitude: 139.7671 }

export function buildClusterSummaries<T extends ClusterLocation>(
  locations: T[],
  visitedIds: Set<string>,
  idOf: (loc: T) => string
): ClusterSummary[] {
  const byCluster = new Map<string, T[]>()
  for (const loc of locations) {
    if (!loc.cluster) continue
    const list = byCluster.get(loc.cluster) ?? []
    list.push(loc)
    byCluster.set(loc.cluster, list)
  }

  const summaries: (ClusterSummary & { distanceFromEdo: number })[] = []
  for (const [name, locs] of byCluster) {
    const withCoords = locs.filter(
      (l): l is T & { latitude: number; longitude: number } => l.latitude !== null && l.longitude !== null
    )

    let maxKm: number | null = null
    for (let i = 0; i < withCoords.length; i++) {
      for (let j = i + 1; j < withCoords.length; j++) {
        const km = haversineKm(withCoords[i], withCoords[j])
        if (maxKm === null || km > maxKm) maxKm = km
      }
    }

    const visited = locs.filter((l) => visitedIds.has(idOf(l))).length
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
      distanceFromEdo: centroid ? haversineKm(EDO, centroid) : Infinity,
    })
  }

  return summaries.sort((a, b) => a.distanceFromEdo - b.distanceFromEdo)
}
