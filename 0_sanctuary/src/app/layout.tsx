import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "./_components/AppShell";
import { resolveDataAppTheme } from "@/lib/resolve-app-html-theme";
import { getAuthenticatedUser } from "@/lib/supabase/get-user";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Sanctuary",
  description: "A safe place to learn languages.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase, user } = await getAuthenticatedUser();
  const dataAppTheme = user
    ? await resolveDataAppTheme(supabase, user.id)
    : "light";

  return (
    <html lang="en" data-app-theme={dataAppTheme}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
