// 東海道五十三次の宿場（起点の日本橋・終点の三条大橋を含む全55地点）。
// 地図（/map）に「重ねて表示できる参考の層」として出すための静的データで、
// Supabaseの locations（作品の比定地）とは別物として扱う。宿場は作品ではなく
// 道そのものの目印であり、訪問の記録や進捗の対象にはしないため、DBに置かずコードで持つ。
//
// 座標は各宿場の本陣跡・宿場の中心など「代表地点」で、小数第4位（約10m）に丸めてある。
// 宿場は数百m〜1km以上の町並みなので、特定の一点を指すものではない。
//
// 出典（2026-09-29に確認）：
//   ・Wikidata 各宿場項目の座標（P625）。多くは日本語版Wikipediaの各宿場記事の座標と同じ値
//   ・日本語版Wikipedia 各記事の座標（Wikidataに無い／ずれていた地点：日本橋・府中・御油・赤坂・藤川・宮）
//   ・国土地理院 住所検索API（https://msearch.gsi.go.jp/address-search/AddressSearch）
//     … Wikidataに座標が無い・食い違っていた地点を、本陣跡の住所や町域から引いた（地点ごとに注記）
// 「概算」と書いた地点は、本陣跡そのものではなく町域の代表点などで、数百mの誤差がありうる。

export type TokaidoStation = {
  /** 日本橋=0、品川=1 … 大津=53、三条大橋=54 */
  order: number
  /** 例「品川宿」。起点・終点は「日本橋」「三条大橋」 */
  name: string
  /** 令制国（武蔵・相模・伊豆・駿河・遠江・三河・尾張・伊勢・近江・山城） */
  province: string
  /** 現在の都府県 */
  prefecture: string
  latitude: number
  longitude: number
}

export const TOKAIDO_STATIONS: readonly TokaidoStation[] = [
  // 日本橋そのもの（Wikipedia「日本橋 (東京都中央区)」）
  { order: 0, name: '日本橋', province: '武蔵', prefecture: '東京都', latitude: 35.6837, longitude: 139.7744 },
  { order: 1, name: '品川宿', province: '武蔵', prefecture: '東京都', latitude: 35.62, longitude: 139.7421 },
  { order: 2, name: '川崎宿', province: '武蔵', prefecture: '神奈川県', latitude: 35.5325, longitude: 139.7029 },
  { order: 3, name: '神奈川宿', province: '武蔵', prefecture: '神奈川県', latitude: 35.475, longitude: 139.633 },
  { order: 4, name: '保土ケ谷宿', province: '武蔵', prefecture: '神奈川県', latitude: 35.444, longitude: 139.5956 },
  { order: 5, name: '戸塚宿', province: '相模', prefecture: '神奈川県', latitude: 35.395, longitude: 139.5299 },
  { order: 6, name: '藤沢宿', province: '相模', prefecture: '神奈川県', latitude: 35.3478, longitude: 139.4829 },
  { order: 7, name: '平塚宿', province: '相模', prefecture: '神奈川県', latitude: 35.3273, longitude: 139.3378 },
  { order: 8, name: '大磯宿', province: '相模', prefecture: '神奈川県', latitude: 35.3091, longitude: 139.3152 },
  { order: 9, name: '小田原宿', province: '相模', prefecture: '神奈川県', latitude: 35.2486, longitude: 139.1605 },
  { order: 10, name: '箱根宿', province: '相模', prefecture: '神奈川県', latitude: 35.1895, longitude: 139.0254 },
  { order: 11, name: '三島宿', province: '伊豆', prefecture: '静岡県', latitude: 35.1193, longitude: 138.9145 },
  { order: 12, name: '沼津宿', province: '駿河', prefecture: '静岡県', latitude: 35.0961, longitude: 138.8568 },
  { order: 13, name: '原宿', province: '駿河', prefecture: '静岡県', latitude: 35.1253, longitude: 138.7979 },
  { order: 14, name: '吉原宿', province: '駿河', prefecture: '静岡県', latitude: 35.1625, longitude: 138.6878 },
  { order: 15, name: '蒲原宿', province: '駿河', prefecture: '静岡県', latitude: 35.12, longitude: 138.6056 },
  // 由比本陣公園の住所（静岡市清水区由比297）を国土地理院APIで引いた。
  // Wikidataの座標は本陣から約2km西の海沿いを指していたため採らなかった
  { order: 16, name: '由比宿', province: '駿河', prefecture: '静岡県', latitude: 35.1078, longitude: 138.5668 },
  // 概算：Wikidata・Wikipediaとも座標が無く、町域「清水区興津本町」の代表点（国土地理院API）
  { order: 17, name: '興津宿', province: '駿河', prefecture: '静岡県', latitude: 35.055, longitude: 138.5143 },
  { order: 18, name: '江尻宿', province: '駿河', prefecture: '静岡県', latitude: 35.0235, longitude: 138.487 },
  // 札の辻付近（Wikipedia「府中宿 (東海道)」。国土地理院の呉服町二丁目とも一致）
  { order: 19, name: '府中宿', province: '駿河', prefecture: '静岡県', latitude: 34.9747, longitude: 138.3878 },
  { order: 20, name: '丸子宿', province: '駿河', prefecture: '静岡県', latitude: 34.9525, longitude: 138.3447 },
  { order: 21, name: '岡部宿', province: '駿河', prefecture: '静岡県', latitude: 34.9189, longitude: 138.2823 },
  { order: 22, name: '藤枝宿', province: '駿河', prefecture: '静岡県', latitude: 34.8704, longitude: 138.2529 },
  { order: 23, name: '島田宿', province: '駿河', prefecture: '静岡県', latitude: 34.8347, longitude: 138.1658 },
  { order: 24, name: '金谷宿', province: '遠江', prefecture: '静岡県', latitude: 34.8227, longitude: 138.1287 },
  { order: 25, name: '日坂宿', province: '遠江', prefecture: '静岡県', latitude: 34.8028, longitude: 138.0758 },
  { order: 26, name: '掛川宿', province: '遠江', prefecture: '静岡県', latitude: 34.7729, longitude: 138.0159 },
  { order: 27, name: '袋井宿', province: '遠江', prefecture: '静岡県', latitude: 34.7475, longitude: 137.9233 },
  { order: 28, name: '見附宿', province: '遠江', prefecture: '静岡県', latitude: 34.7268, longitude: 137.857 },
  { order: 29, name: '浜松宿', province: '遠江', prefecture: '静岡県', latitude: 34.706, longitude: 137.7281 },
  { order: 30, name: '舞坂宿', province: '遠江', prefecture: '静岡県', latitude: 34.6846, longitude: 137.609 },
  { order: 31, name: '新居宿', province: '遠江', prefecture: '静岡県', latitude: 34.6947, longitude: 137.5613 },
  { order: 32, name: '白須賀宿', province: '遠江', prefecture: '静岡県', latitude: 34.6886, longitude: 137.5008 },
  { order: 33, name: '二川宿', province: '三河', prefecture: '愛知県', latitude: 34.7233, longitude: 137.4498 },
  { order: 34, name: '吉田宿', province: '三河', prefecture: '愛知県', latitude: 34.7666, longitude: 137.3896 },
  // Wikipedia「御油宿」の座標。Wikidataの値は約3.6km南にずれていたため採らなかった
  { order: 35, name: '御油宿', province: '三河', prefecture: '愛知県', latitude: 34.845, longitude: 137.3173 },
  { order: 36, name: '赤坂宿', province: '三河', prefecture: '愛知県', latitude: 34.8558, longitude: 137.3082 },
  { order: 37, name: '藤川宿', province: '三河', prefecture: '愛知県', latitude: 34.9113, longitude: 137.2221 },
  { order: 38, name: '岡崎宿', province: '三河', prefecture: '愛知県', latitude: 34.958, longitude: 137.1692 },
  // 概算：Wikidataの座標が小数第3位までしかなく、町域「知立市本町」の代表点（国土地理院API）と照合した
  { order: 39, name: '池鯉鮒宿', province: '三河', prefecture: '愛知県', latitude: 35.0082, longitude: 137.041 },
  { order: 40, name: '鳴海宿', province: '尾張', prefecture: '愛知県', latitude: 35.0805, longitude: 136.9498 },
  // 七里の渡し付近（Wikipedia「宮宿」）
  { order: 41, name: '宮宿', province: '尾張', prefecture: '愛知県', latitude: 35.1204, longitude: 136.9069 },
  { order: 42, name: '桑名宿', province: '伊勢', prefecture: '三重県', latitude: 35.0684, longitude: 136.6961 },
  { order: 43, name: '四日市宿', province: '伊勢', prefecture: '三重県', latitude: 34.9705, longitude: 136.6255 },
  { order: 44, name: '石薬師宿', province: '伊勢', prefecture: '三重県', latitude: 34.8967, longitude: 136.5506 },
  { order: 45, name: '庄野宿', province: '伊勢', prefecture: '三重県', latitude: 34.8921, longitude: 136.5258 },
  { order: 46, name: '亀山宿', province: '伊勢', prefecture: '三重県', latitude: 34.8548, longitude: 136.4544 },
  { order: 47, name: '関宿', province: '伊勢', prefecture: '三重県', latitude: 34.8517, longitude: 136.4004 },
  { order: 48, name: '坂下宿', province: '伊勢', prefecture: '三重県', latitude: 34.8886, longitude: 136.3541 },
  { order: 49, name: '土山宿', province: '近江', prefecture: '滋賀県', latitude: 34.9348, longitude: 136.2823 },
  { order: 50, name: '水口宿', province: '近江', prefecture: '滋賀県', latitude: 34.9662, longitude: 136.1821 },
  { order: 51, name: '石部宿', province: '近江', prefecture: '滋賀県', latitude: 35.0101, longitude: 136.0546 },
  { order: 52, name: '草津宿', province: '近江', prefecture: '滋賀県', latitude: 35.0177, longitude: 135.9605 },
  { order: 53, name: '大津宿', province: '近江', prefecture: '滋賀県', latitude: 35.006, longitude: 135.8614 },
  { order: 54, name: '三条大橋', province: '山城', prefecture: '京都府', latitude: 35.0091, longitude: 135.7717 },
]

/** 起点（日本橋）と終点（三条大橋）の order */
export const TOKAIDO_FIRST_ORDER = 0
export const TOKAIDO_LAST_ORDER = 54
