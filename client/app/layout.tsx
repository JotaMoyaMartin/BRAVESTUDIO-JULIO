import type { Metadata } from 'next'
import {
  Poppins, Fraunces, Yellowtail, Montserrat,
  Bebas_Neue, DM_Serif_Display, Archivo_Black, Space_Grotesk,
} from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-poppins',
  display: 'swap',
})

// Familia Editorial (carruseles): serif suave del titular + script de la inicial decorativa.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: '300',
  variable: '--font-fraunces',
  display: 'swap',
})

const yellowtail = Yellowtail({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-yellowtail',
  display: 'swap',
})

/* Tipografías curadas de Stories Diseño (lib/stories-diseno/fonts.ts).
   Nunca Cormorant/Playfair/Inter/Manrope/Jost. */
const montserrat = Montserrat({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' })
const dmserif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dmserif', display: 'swap' })
const archivo = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700'], variable: '--font-grotesk', display: 'swap' })

export const metadata: Metadata = {
  title: 'BRÄVE Studio',
  description: 'Tu herramienta de contenido para salones de belleza',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'BRÄVE Studio',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport = {
  themeColor: '#7A1832',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} ${fraunces.variable} ${yellowtail.variable} ${montserrat.variable} ${bebas.variable} ${dmserif.variable} ${archivo.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  )
}