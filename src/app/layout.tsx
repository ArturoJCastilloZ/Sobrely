import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Dancing_Script,
  Montserrat,
  Cormorant_Garamond,
  Pacifico,
  Lora,
  DM_Sans,
  Space_Grotesk,
  Nunito,
  Great_Vibes,
  Bebas_Neue,
  Abril_Fatface,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./animations.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  SITE_URL,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  preload: false,
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonts offered by the per-invitation theme panel (Fase 5).
// Las 11 de tema y Geist Mono llevan `preload: false`: el @font-face sigue
// declarado y el navegador la baja solo cuando una página la usa, pero ya no se
// precargan en TODAS las rutas. Medido en producción (24 oct 2026): los 14
// archivos (411 KB) se pedían a la vez con prioridad alta y el LCP móvil de
// las páginas de marketing llegaba a ~4 s. Playfair (`--font-display`) y Geist
// Sans sí se precargan: son la tipografía de la marca.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const dancing = Dancing_Script({
  preload: false,
  variable: "--font-dancing",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  preload: false,
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  preload: false,
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pacifico = Pacifico({
  preload: false,
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  preload: false,
});
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  preload: false,
});
const spaceGrotesk = Space_Grotesk({
  preload: false,
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  preload: false,
});
const greatVibes = Great_Vibes({
  preload: false,
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});
const bebasNeue = Bebas_Neue({
  preload: false,
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});
const abrilFatface = Abril_Fatface({
  preload: false,
  variable: "--font-abril-fatface",
  subsets: ["latin"],
  weight: "400",
});

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${dancing.variable} ${montserrat.variable} ${cormorant.variable} ${pacifico.variable} ${lora.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${nunito.variable} ${greatVibes.variable} ${bebasNeue.variable} ${abrilFatface.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
