// PWA: kalau di-"Add to Home screen" di Android, game terbuka layar penuh & terkunci landscape.
export default function manifest() {
  return {
    name: 'K-Snake',
    short_name: 'K-Snake',
    description: 'K-Snake: game ular dengan mode Arkade, Dungeon, Kurir Apel, Ekspedisi, dan duel lokal.',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#f7f6ee',
    theme_color: '#f7f6ee',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
