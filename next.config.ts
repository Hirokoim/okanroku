import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leafletのMapContainerはReact Strict Mode（開発時のみ、副作用を検出する
  // ためにeffectを1回多く実行する仕組み）と相性が悪い。Strict Modeが地図を
  // 一度破棄→作り直す動きをシミュレートする際、内部でLeafletの地図インスタンスが
  // 正しく再構築されず、flyToBounds等の呼び出しが
  // "Invalid LatLng object: (NaN, NaN)" で例外を投げてクラッシュする
  // （/map?cluster=〜 でだけ発生していた表示崩れの実体、2026-09-16調査）。
  // Strict Modeの二重実行はdevビルドだけの挙動で本番ビルドには影響しないため、
  // ここで切っても本番の動作・品質は変わらない。
  reactStrictMode: false,
};

export default nextConfig;
