// PWA: kalau di-"Add to Home screen" di Android, game terbuka layar penuh & terkunci landscape.
export default function manifest() {
  return {
    name: 'Snake',
    short_name: 'Snake',
    description: 'Snake - Classic, Portal, Time Attack, Mayhem, Mayhem+',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#1e1e1e',
    theme_color: '#4a752c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
