import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { TRPCProvider } from "@/trpc/client";
import { ProjectProvider } from "@/lib/project-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SEOSH.AI — All-in-One SEO Platform",
    template: "%s | SEOSH.AI",
  },
  description:
    "Automate your SEO: from semantic core collection to AI-powered content generation and publishing. One platform for entrepreneurs and SEO specialists.",
  keywords: [
    "SEO platform",
    "semantic core",
    "content generation",
    "AI SEO",
    "keyword clustering",
    "SEO automation",
  ],
  authors: [{ name: "SEOSH.AI Team" }],
  openGraph: {
    title: "SEOSH.AI — All-in-One SEO Platform",
    description: "Automate your SEO workflow with AI",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-surface-950 bg-grid font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TRPCProvider>
            <ProjectProvider>
              {children}
            </ProjectProvider>
          </TRPCProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
