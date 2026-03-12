import type { Metadata } from "next";
import { Zen_Dots, Oxanium } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { Providers } from "@/components/providers";
import "./globals.css";

const zenDots = Zen_Dots({
  variable: "--font-zen-dots",
  weight: "400",
  subsets: ["latin"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ZoriaGen — AI Video Generator",
  description: "AI-based video generator powered by $ZORIA tokens",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${zenDots.variable} ${oxanium.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <Providers>
          <div suppressHydrationWarning>
            <Sidebar />
            <main className="lg:ml-[280px] min-h-screen px-4 md:px-12 pt-20 lg:pt-6 pb-20 relative z-[1]" suppressHydrationWarning>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
