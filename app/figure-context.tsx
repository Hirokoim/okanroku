'use client'

// いま選んでいる人物の表示用の情報（lib/figure-meta.ts）を、ブラウザ側の部品へ渡す。
//
// 地図の吹き出し・作品一覧・開拓マップなど「第◯景」を出す部品は、ページから何段も
// 下にあるブラウザ側の部品で、同じ値を全部の段に引数で渡していくと、地図の部品が
// 人物のことを知らないまま中継するだけの引数だらけになる。そのためレイアウト
// （app/layout.tsx）で一度だけ包み、必要な部品が useFigureMeta() で取り出す。
// 包まれていない所（一時的な確認用ページなど）では北斎の情報を返す。

import { createContext, useContext } from 'react'
import { DEFAULT_FIGURE_NAME, figureMeta, type FigureMeta } from '@/lib/figure-meta'

const FigureMetaContext = createContext<FigureMeta>(figureMeta(DEFAULT_FIGURE_NAME))

export function FigureMetaProvider({ meta, children }: { meta: FigureMeta; children: React.ReactNode }) {
  return <FigureMetaContext.Provider value={meta}>{children}</FigureMetaContext.Provider>
}

export function useFigureMeta() {
  return useContext(FigureMetaContext)
}
