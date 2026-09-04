// 地図パネルの配色（茶＋金の和風パレット）。
// 以前は #e8c87a などの色コードが map-view.tsx の style に40か所以上直接
// 書かれていたため、色を1つ変えるだけで全体を探し回る必要があった。
//
// 出典: MulmoClaude(fugaku-36コレクション)の地図ビューの配色
//       ~/mulmoclaude/data/skills/fugaku-36/views/map.html

export const MAP_THEME = {
  // 地図の外枠とツールバー（暗い背景の上）
  panel: {
    bg: '#1a1008',
    divider: '#3a2a10',
    title: '#e8c87a',
    text: '#c8a060',
    muted: '#8a6a30',
    line: '#5a3a10',
    activeBg: '#a07040',
    activeText: '#fff',
  },

  // 地図に重ねる箱（検索ボックス・凡例）
  overlay: {
    bg: 'rgba(26,16,8,.95)',
    bgOpaque: 'rgba(26,16,8,.97)',
    bgLegend: 'rgba(26,16,8,.92)',
    border: '1.5px solid #5a3a10',
    inputText: '#f5e8d0',
    rowDivider: '#2a1a08',
  },

  // ポップアップ（Leafletが描く白い吹き出しの上に乗るので、暗い文字色を使う）
  popup: {
    text: '#2a1a0a',
    sub: '#6b4a28',
    meta: '#5a3d20',
    link: '#8a4a00',
    seriesBg: '#3a2a60',
    seriesText: '#a090e0',
    visitedBg: '#2a4a20',
    visitedText: '#6aaa40',
    unvisitedBg: '#3a2a10',
    unvisitedText: '#8a6a30',
  },

  // マーカー
  marker: {
    visited: { bg: '#6aaa40', border: '#2a5a10', text: '#fff' },
    unvisited: { bg: '#e8c87a', border: '#8a4a00', text: '#3a1a00' },
    visit: { bg: '#3a8ac8', border: '#1a4a70' },
    fuji: { body: '#2a1a06', snow: '#e8c87a' },
  },
} as const
