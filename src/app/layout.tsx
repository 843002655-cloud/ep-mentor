import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yovigo.cn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EP Mentor — 心脏电生理AI导师",
    template: "%s | EP Mentor",
  },
  description:
    "专为心脏电生理医生打造的苏格拉底式AI教学平台。通过逐层提问引导你推导心律失常机制——不是直接给答案，而是像资深术者一样思考每一份EGM。覆盖SVT、房颤、室速、房扑的经典病例库。",
  keywords: ["电生理", "心脏电生理", "AI教学", "心电图", "腔内电图", "SVT", "房颤", "室速", "导管消融"],
  openGraph: {
    type: "website",
    siteName: "EP Mentor",
    title: "EP Mentor — 心脏电生理AI导师",
    description: "通过苏格拉底式对话，像资深术者一样思考每一份EGM",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EP Mentor — 心脏电生理AI导师",
    description: "通过苏格拉底式对话，像资深术者一样思考每一份EGM",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/icon", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icon", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[#1B4F8A] focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F8A] focus:ring-offset-2"
        >
          跳到主要内容
        </a>
        <div id="main-content">{children}</div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
