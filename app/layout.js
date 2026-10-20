import './globals.css';

// Font cartoonish (Fredoka) di-load via <link> biasa di head, bukan next/font,
// supaya nggak butuh koneksi internet pas `next build` — cuma pas dibuka di
// browser aja. Kalau mau full offline, download family-nya lalu pindah ke
// @font-face lokal di globals.css.
export const metadata = {
  title: 'K-Snake · Satu ronde lagi?',
  description: 'K-Snake: game ular dengan mode Arkade, Dungeon, Kurir Apel, Ekspedisi, dan duel lokal.',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f6ee',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex flex-col items-center">
        {children}
      </body>
    </html>
  );
}
