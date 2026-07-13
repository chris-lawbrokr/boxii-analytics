import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Nav } from "@/components/ui/nav/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boxii Analytics",
  description: "Boxii overlay analytics dashboard powered by PostHog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`}>
      <body>
        <Nav>{children}</Nav>
      </body>
    </html>
  );
}
