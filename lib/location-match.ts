// 写真のGPSから地点候補を出す（機能②「地点候補の提示」・roadmap.md Phase1タスク(D)）。
// 写真のGPSとlocationsの比定地との距離を計算し、近い順に候補を出す。
// 江戸・千住のように同じクラスタ内の地点同士が1km台まで近いケースがあるため、
// 「近ければ自動確定」まではせず、候補を提示して人に選んでもらう前提にしてある。

import { haversineKm } from './clusters'

export type MatchableLocation = {
  id: string
  number: number
  title_jp: string
  latitude: number | null
  longitude: number | null
}

export type LocationCandidate = {
  location: MatchableLocation
  distanceKm: number
}

// 候補として提示する数（要件定義書 機能②「近い順に2〜3件」）
const CANDIDATE_COUNT = 3

/** 写真の座標に近い地点を、近い順に最大3件返す。座標が無ければ空配列。 */
export function findNearestLocations(
  coords: { latitude: number; longitude: number } | null,
  locations: MatchableLocation[]
): LocationCandidate[] {
  if (!coords) return []
  return locations
    .filter((l): l is MatchableLocation & { latitude: number; longitude: number } => l.latitude !== null && l.longitude !== null)
    .map((location) => ({ location, distanceKm: haversineKm(coords, location) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, CANDIDATE_COUNT)
}
