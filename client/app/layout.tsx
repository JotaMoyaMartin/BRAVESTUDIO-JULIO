import type { Metadata } from 'next'
import Script from 'next/script'
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
      <body>
        {/* Meta Pixel (bravestudio-web) — ID público; PageView en todas las páginas. */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1486708769963252');
fbq('track', 'PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1486708769963252&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}