import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";

import { CartSheetProvider } from "@/components/cart-sheet";
import { ChatWidget } from "@/components/chat-widget";
import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";

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
  title: "ShopAI — Your AI-powered store",
  description:
    "An ecommerce demo store with an AI shopping assistant powered by Groq.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <Providers session={session}>
          <CartSheetProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="bg-stone-900 py-6 text-center text-sm text-stone-300">
              ShopAI — demo store powered by Django, Stripe and Groq
            </footer>
            <ChatWidget />
          </CartSheetProvider>
        </Providers>
      </body>
    </html>
  );
}
