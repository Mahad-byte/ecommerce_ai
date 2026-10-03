import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            ShopAI — demo store powered by Django, Stripe and Groq
          </footer>
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
