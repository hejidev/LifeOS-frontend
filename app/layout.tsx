import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";


export const metadata: Metadata = {
  title: "LifeOS — Your AI Life Operating System",
  description: "One intelligent platform to manage every aspect of your life. Free forever.",
};

<meta name="google-site-verification" content="BrG1L5uaVIMjAYAK7qbmk72MJjncX2LvmVCm2OKqfrk" />

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full dark`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}