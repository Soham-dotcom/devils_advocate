import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shared/Navbar";
import { SmoothScroll } from "@/components/shared/SmoothScroll";

// Display: a grotesque with real width and weight. The previous display serif
// was too thin to read below ~24px, which is where most headings actually live.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Body: chosen for legibility at 14-16px, which is nearly all of this UI.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

// Data: statutory citations are identifiers, not prose, so they are set as code.
const data = JetBrains_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Devil's Advocate — AI Legal Case Analysis",
  description:
    "Six AI agents read a case, argue both sides, audit the evidence, and surface similar Supreme Court judgments. The judgment stays yours.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${data.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SmoothScroll />
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
