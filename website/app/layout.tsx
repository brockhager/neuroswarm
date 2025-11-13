import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeuroSwarm Knowledge Base",
  description: "Comprehensive knowledge base for the NeuroSwarm decentralized AI platform",
  keywords: ["NeuroSwarm", "decentralized AI", "blockchain", "knowledge base", "documentation"],
  authors: [{ name: "NeuroSwarm Team" }],
  creator: "NeuroSwarm",
  publisher: "NeuroSwarm",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: "NeuroSwarm Knowledge Base",
    description: "Comprehensive knowledge base for the NeuroSwarm decentralized AI platform",
    url: "https://getblockchain.tech/neuroswarm",
    siteName: "NeuroSwarm Knowledge Base",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroSwarm Knowledge Base",
    description: "Comprehensive knowledge base for the NeuroSwarm decentralized AI platform",
    creator: "@neuroswarm",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'your-google-site-verification-code', // Replace with actual verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'GA_MEASUREMENT_ID', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
