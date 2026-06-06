import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-noto-sans-sc",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.yovigo.cn"),
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSansSC.variable} ${notoSerifSC.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
