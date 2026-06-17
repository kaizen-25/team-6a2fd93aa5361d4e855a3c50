import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "IIT Ropar FAQ — Crowdsource Knowledge Platform",
  description: "A crowd-sourced FAQ platform for IIT Ropar students. Browse FAQs, raise queries, and help peers by solving queries.",
  keywords: "IIT Ropar, FAQ, crowdsource, queries, student help",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Navbar />
          <div className="page-container">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
