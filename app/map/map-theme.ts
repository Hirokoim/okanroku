// 地図パネルの配色：D案「凱風快晴」（app/globals.css）に合わせた明るい配色。
// 地図まわりはLeafletにstyle文字列で色を渡す箇所が多く、Tailwindの色変数を
// そのまま使えないため、ここで色コードとして持つ。値はglobals.cssの同名の役割と揃えること。
//
// 以前の茶＋金の配色の出典: MulmoClaude(fugaku-36コレクション)の地図ビュー

// 地図タイルの候補。どちらもクラスタの円・ピンがD案の配色で乗るように、
// globals.css の className 側で色味を調整している。
const TILES = {
  // OpenStreetMap。山の緑や街の色があり、にぎやかでかわいい。少しだけ彩度を落とす
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    className: 'okr-map-tiles-osm',
  },
  // 国土地理院の淡色地図（日本国内のみ）。白い陸と空色の海ですっきり見える
  gsiPale: {
    url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>',
    maxZoom: 18,
    className: 'okr-map-tiles-gsi',
  },
} as const

// 使う地図タイル。見比べるときはここを 'osm' / 'gsiPale' で切り替える
export const MAP_TILE = TILES.gsiPale

export const MAP_THEME = {
  // 地図の外枠とツールバー
  panel: {
    bg: '#f4efe6',
    divider: 'rgba(43,29,23,.14)',
    title: '#2b1d17',
    text: '#6b5548',
    muted: '#6b5548',
    line: 'rgba(43,29,23,.28)',
    activeBg: '#a8432b',
    activeText: '#f4efe6',
  },

  // 地図に重ねる箱（検索ボックス・凡例）
  overlay: {
    bg: 'rgba(244,239,230,.95)',
    bgOpaque: 'rgba(244,239,230,.98)',
    bgLegend: 'rgba(244,239,230,.94)',
    border: '1px solid rgba(43,29,23,.22)',
    inputText: '#2b1d17',
    rowDivider: 'rgba(43,29,23,.1)',
  },

  // ポップアップ（Leafletが描く白い吹き出しの上に乗るので、暗い文字色を使う）
  popup: {
    text: '#2b1d17',
    sub: '#6b5548',
    meta: '#6b5548',
    link: '#8a5a14',
    seriesBg: '#2f5f80',
    seriesText: '#f4efe6',
    visitedBg: '#3d5a3a',
    visitedText: '#f4efe6',
    unvisitedBg: '#ebe3d4',
    unvisitedText: '#6b5548',
  },

  // 開拓マップ（クラスタ単位の進捗を円で重ねるモード）。
  // シールのような円で、未踏＝生成り（薄い赤茶のふち。白いふちだと白い陸地に溶けるため）、
  // 開拓中＝白いふちの薄い赤茶の中に訪問率ぶんの赤茶の丸、制覇＝赤茶一色＋黄土のふち。
  cluster: {
    none: '#fffaf0',
    noneRim: '#e98a6e',
    partial: '#e98a6e',
    fill: '#a8432b',
    rim: '#ffffff',
    gold: '#e3b35a',
    route: '#a8432b',
  },

  // マーカー
  marker: {
    // 開拓マップの円と同じシール風。訪問済みは松緑に白いふち、未訪問は生成りに
    // 薄い赤茶のふち（白いふちだと白い陸地に溶けるため）。明るさの差でも見分けられ、✓バッジも付く
    visited: { bg: '#3d5a3a', border: '#ffffff', text: '#f4efe6' },
    unvisited: { bg: '#fffaf0', border: '#e98a6e', text: '#a8432b' },
    visit: { bg: '#9cc3dc', border: '#2f5f80' },
    // 富士山のマーカーそのものを赤富士にする
    fuji: { body: '#a8432b', snow: '#f4efe6' },
    // 現在地。地図アプリ共通の「白縁の青い点」に寄せてある。パレットからは
    // 外れるが、歩きながら一瞬見て「自分だ」と分かることを優先した。
    // 📷の訪問地点（過去の記録）とは、形と明るさで区別する。
    here: { dot: '#2f7fed', ring: '#ffffff' },
  },

  // 東海道の宿場（参考の層）。歌川広重の「広重ブルー」に寄せた藍。
  // 46景のピン（丸・生成りや松緑）と色でも形（角丸の四角）でも見分けられるようにする。
  tokaido: {
    bg: '#2f5f80',
    text: '#f4efe6',
    border: '#ffffff',
    shadow: 'rgba(43,29,23,.3)',
    route: '#2f5f80',
  },
} as const
