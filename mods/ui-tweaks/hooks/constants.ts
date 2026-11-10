// Sidebar item widths match the corresponding label + icon text at the
// default font size. If you add items or rename labels, measure the new
// label and update width to avoid text truncation or button overlap.

export const navItems = [
  { id: 'home', label: 'Home', asset: 'assets/home-icon.png', page: 'HomePage', width: 80 },
  { id: 'library', label: 'Library', asset: 'assets/library-icon.png', page: 'LibraryPage', width: 85 },
  { id: 'servers', label: 'Private Servers', asset: 'assets/private-servers-icon.png', page: 'PrivateServersPage', width: 130 },
  { id: 'mods', label: 'Voidstrap Mods', asset: 'assets/voidstrap-mods-icon.png', page: 'VoidstrapModsPage', width: 135 },
] as const;

export type TopbarMode = 'dropdown' | 'labels' | 'icons';
