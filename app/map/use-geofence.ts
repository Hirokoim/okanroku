// 機能⑥-B（ジオフェンスによる解説の自動提示）の検知部分だけを切り出したフック。
//
// 解説レイヤー本体（機能⑥）の文章がまだ無いため、ここでは「比定地に近づいたこと」を
// 検知して知らせるところまでを技術検証する。実際の訪問前／訪問後の解説文への
// 差し替えは、機能⑥の解説コンテンツと、記録フォームのlocation_id連携（roadmap.md
// Phase1タスクB）が揃ってから行う。

import { useCallback, useEffect, useRef, useState } from 'react'
import { distanceMeters, type LocationPin } from './map-view'

// 接近とみなす半径。requirements.md 機能⑥-Bの通り初期値は要検証の仮値。
export const GEOFENCE_RADIUS_METERS = 150

export function useGeofence(locations: LocationPin[]) {
  const [watching, setWatching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nearby, setNearby] = useState<LocationPin | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const dismissedRef = useRef<Set<string>>(new Set())

  // アンマウント時は必ず監視を止める（バッテリー消費・ブラウザの位置情報インジケータ対策）
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('この端末・ブラウザは位置情報に対応していません')
      return
    }
    setError(null)
    dismissedRef.current = new Set()
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        let closest: LocationPin | null = null
        let closestDist = Infinity
        for (const l of locations) {
          if (l.latitude === null || l.longitude === null) continue
          if (dismissedRef.current.has(l.id)) continue
          const d = distanceMeters(here, [Number(l.latitude), Number(l.longitude)])
          if (d <= GEOFENCE_RADIUS_METERS && d < closestDist) {
            closest = l
            closestDist = d
          }
        }
        setNearby(closest)
      },
      (err) => setError(err.message || '位置情報を取得できませんでした'),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    )
    watchIdRef.current = id
    setWatching(true)
  }, [locations])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
    setNearby(null)
  }, [])

  const toggle = useCallback(() => (watching ? stop() : start()), [watching, start, stop])

  // このバナーだけ閉じる（監視自体は継続。再接近すればまた出る）
  const dismiss = useCallback((id: string) => {
    dismissedRef.current.add(id)
    setNearby((cur) => (cur?.id === id ? null : cur))
  }, [])

  return { watching, error, nearby, toggle, dismiss }
}
