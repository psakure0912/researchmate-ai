import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ResearchMate AI — Intelligent AI-Powered Research Assistant",
    template: "%s | ResearchMate AI",
  },
  description:
    "Analyze academic PDFs with grounded RAG citations, compare literature matrices, identify research gaps, and discover papers via Semantic Scholar & arXiv.",
  keywords: [
    "AI research assistant",
    "RAG",
    "academic papers",
    "literature review",
    "research gap analysis",
    "Semantic Scholar",
    "arXiv",
    "Google Gemini",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "ResearchMate AI",
    title: "ResearchMate AI — Intelligent AI-Powered Research Assistant",
    description:
      "Read papers faster, generate cited RAG answers, build literature review matrices, and spot research gaps in minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResearchMate AI — Intelligent AI-Powered Research Assistant",
    description:
      "Grounded academic research assistant powered by RAG, Google Gemini, Semantic Scholar, and arXiv.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
