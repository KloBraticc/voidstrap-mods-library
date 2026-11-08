export const navItems = [
  { id: 'home', label: 'Home', asset: 'assets/home-icon.png', page: 'HomePage', width: 80 },
  { id: 'library', label: 'Library', asset: 'assets/library-icon.png', page: 'LibraryPage', width: 85 },
  { id: 'servers', label: 'Private Servers', asset: 'assets/private-servers-icon.png', page: 'PrivateServersPage', width: 130 },
  { id: 'mods', label: 'Voidstrap Mods', asset: 'assets/voidstrap-mods-icon.png', page: 'VoidstrapModsPage', width: 135 },
  { id: 'news', label: 'News', asset: 'assets/news-icon.png', page: 'NewsPage', width: 75 },
] as const;

export type TopbarMode = 'dropdown' | 'labels' | 'icons';
