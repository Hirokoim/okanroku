import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "./bottom-nav";

export const metadata: Metadata = {
  title: "往還録",
  description: "歴史上の人物が見た世界を現代で追体験する旅の記録",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ボトムナビ（往還／地図／記録／設定）はログイン後の画面にしか意味を持たない
  // （未ログインではどのタブも「ログインしてください」しか出せないため）。
  // 各ページも個別にログイン状態を見ているが、ここは「ナビを出すか」だけの判定。
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 本文用（Zen Kaku Gothic New）。以前は見出しにShippori Minchoも
            使っていたが、アクセシビリティ改善で全画面ゴシック体に統一したため
            読み込みをやめた（2026-09-18）。
            CJKフォントはnext/fontでの自前ホストだとビルド時取得が重いため、
            プロトタイプ（UXアートファクト）と同じくGoogle Fonts配信のまま使う。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
        {/* 文字サイズ設定（設定画面）の復元。ページが表示される前に同期実行し、
            標準→大 のような一瞬の切り替わり（ちらつき）を防ぐ。
            キー名はapp/settings/font-size-setting.tsxと合わせること。
            beforeInteractive: Reactのハイドレーションより前に実行させるための
            next/script指定（生の<script>タグはApp Routerでは実行されない）。 */}
        <Script id="font-scale-init" strategy="beforeInteractive">
          {`try{var s=localStorage.getItem('okr-font-scale');if(s)document.documentElement.dataset.fontScale=s;}catch(e){}`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {user && <BottomNav />}
      </body>
    </html>
  );
}
