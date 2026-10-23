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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
});

const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
});
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});
const abrilFatface = Abril_Fatface({
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
