import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "往還録",
  description: "歴史上の人物が見た世界を現代で追体験する旅の記録",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        {/* 見出し用（Shippori Mincho）・本文用（Zen Kaku Gothic New）。
            CJKフォントはnext/fontでの自前ホストだとビルド時取得が重いため、
            プロトタイプ（UXアートファクト）と同じくGoogle Fonts配信のまま使う。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
