import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OnboardingGuide } from "@/components/OnboardingGuide";

export const metadata: Metadata = {
  title: "FINSI - 퀀트 투자 자동화",
  description: "초보자를 위한 AI 기반 퀀트 투자 신호 시스템",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FINSI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080810",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body>
        <OnboardingGuide />
        {children}
      </body>
    </html>
  );
}
