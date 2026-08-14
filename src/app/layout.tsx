import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Dancing_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./animations.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { JsonLd } from "@/components/seo/json-ld";

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
const SITE_TITLE = "Sobrely — Invitaciones digitales dinámicas";
const SITE_DESCRIPTION =
  "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.";

export const metadata: Metadata = {
  // Base para resolver URLs relativas de OG/canónicas a absolutas. Lee de env
  // para no hardcodear el dominio (en prod = dominio real; en local = localhost).
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Sobrely",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Sobrely",
  openGraph: {
    type: "website",
    siteName: "Sobrely",
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
  // Verificación de propiedad para Google Search Console (método "HTML tag").
  // El código lo da Search Console; se configura como env var (no se hardcodea).
  // Si la var no está, Next omite el <meta> automáticamente.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Sobrely",
  url: SITE_URL,
  logo: `${SITE_URL}/sobrely-logo-horizontal.png`,
  description: SITE_DESCRIPTION,
};

const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Sobrely",
  url: SITE_URL,
  inLanguage: "es-MX",
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={[ORGANIZATION_LD, WEBSITE_LD]} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        {/* Vercel Web Analytics: cookieless, agregado. Solo emite en Vercel;
            en local/otros hosts es no-op. */}
        <Analytics />
      </body>
    </html>
  );
}
