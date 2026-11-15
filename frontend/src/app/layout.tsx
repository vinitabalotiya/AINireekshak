import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AiNireekshak — Multilingual AI Hackathon Judging Platform",
  description:
    "An AI hackathon judge understanding participants speaking naturally in Hindi, Hinglish, English, and regional Indian languages with synthetic avatar interaction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full" style={{ colorScheme: "dark" }}>
      <body className={`${inter.variable} font-sans min-h-full flex flex-col bg-black text-white antialiased`}>
        <TooltipProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
