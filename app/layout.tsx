import type { Metadata } from "next";
import { Young_Serif, DM_Sans, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import { Topbar } from "@/src/components/ui/Topbar";
import { Footer } from "@/src/components/ui/Footer";
import "./globals.css";

/**
 * Font loading is LOAD-BEARING — see app/CLAUDE.md critical rule #2.
 *
 * Young Serif has no italic face. Terracotta editorial italics
 * (.t-display em, .t-h1 em, .t-h2 em in tokens.css) depend on <em>
 * being rendered in Source Serif 4 italic via `--display-italic`.
 * Any change here must preserve:
 *   1. Young Serif 400 loaded, exposed as --font-young-serif
 *   2. Source Serif 4 italic 400 loaded, exposed as --font-source-serif-italic
 *   3. Both variables wired into --display / --display-italic in tokens.css
 *
 * Add a visual regression check on the hero before changing font config.
 */
const youngSerif = Young_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-young-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sourceSerifItalic = Source_Serif_4({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-source-serif-italic",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RadMedicine — Healthcare, delivered directly",
  description:
    "A marketplace for Direct Primary Care. Flat monthly fee, real doctors, insurance stays for emergencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${youngSerif.variable} ${dmSans.variable} ${sourceSerifItalic.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Topbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
