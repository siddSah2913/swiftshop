import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwiftShop — Own your shop online",
  description:
    "Create your own e-commerce store in minutes. Nepali payments, Nepali delivery, WhatsApp orders.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read once so <html lang> matches the storefront/panel language.
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}