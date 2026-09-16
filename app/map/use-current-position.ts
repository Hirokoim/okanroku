'use client'

// 現在地をGPSで追い続けるフック。
// 機能⑦（現地モード）の土台で、ここで取った現在地を
// 地図のマーカー・富士山コンパス・近接検知が共通して使う。
//
// watchPosition（変化を追い続ける）を使うのは、歩きながら位置が動くのを
// 見せるため。記録フォームの「現在地を使う」が使っている
// getCurrentPosition（一度きり）とは用途が違う。

import { useCallback, useEffect, useRef, useState } from 'react'

export type CurrentPosition = {
  latitude: number
  longitude: number
  /** GPSの誤差半径（メートル）。地図に描く円の大きさに使う */
  accuracy: number
  /**
   * 進行方向（北を0度とした時計回り、度）。静止している間や、
   * 端末・ブラウザが対応していない場合はnullになる（Geolocation APIの仕様）。
   * マーカーの矢印の向きに使う（map-icons.tsのhereIcon参照）。
   */
  heading: number | null
}

export function useCurrentPosition() {
  const [position, setPosition] = useState<CurrentPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  // 画面を離れるときは必ず監視を止める。止め忘れるとバッテリーを食い続け、
  // ブラウザの位置情報インジケータも出しっぱなしになる。
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
  }, [])

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('この端末・ブラウザでは現在地を取得できません')
      return
    }
    setError(null)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null)
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
        })
      },
      (err) => {
        // 許可されていない場合は、待っても回復しないので監視を止める
        if (err.code === err.PERMISSION_DENIED) {
          setError('位置情報の利用が許可されていません。ブラウザの設定から許可してください。')
          stop()
          return
        }
        // 圏外・測位中は監視を続ける。電波が戻れば自動で復帰する
        // （7章「電波の弱い山道・史跡での利用を想定する」に合わせた扱い）
        setError('現在地を取得できません（電波が届いていないか、測位中です）')
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    )
    setWatching(true)
  }, [stop])

  const toggle = useCallback(() => (watching ? stop() : start()), [watching, start, stop])

  return { position, error, watching, toggle }
}
