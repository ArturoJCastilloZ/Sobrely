import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Dancing_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./animations.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonts offered by the per-invitation theme panel (Fase 5).
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_TITLE = "InvitaFlow — Invitaciones digitales dinámicas";
const SITE_DESCRIPTION =
  "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.";

export const metadata: Metadata = {
  // Base para resolver URLs relativas de OG/canónicas a absolutas. Lee de env
  // para no hardcodear el dominio (en prod = dominio real; en local = localhost).
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · InvitaFlow",
  },
  description: SITE_DESCRIPTION,
  applicationName: "InvitaFlow",
  openGraph: {
    type: "website",
    siteName: "InvitaFlow",
    locale: "es_MX",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        {/* Vercel Web Analytics: cookieless, agregado. Solo emite en Vercel;
            en local/otros hosts es no-op. */}
        <Analytics />
      </body>
    </html>
  );
}
