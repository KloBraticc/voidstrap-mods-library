import type { Engine } from 'voidstrap';

export interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly asset: string;
  readonly page: string;
  readonly width: number;
  readonly excludePlatforms?: ('windows' | 'linux' | 'macos')[];
}

export const getNavItems = ($: Engine) => {
  const currentPlatform = $.app.platform;
  // Sidebar item widths match the corresponding label + icon text at the
  // default font size. If you add items or rename labels, measure the new
  // label and update width to avoid text truncation or button overlap.
  const items: NavItem[] = [
    { id: 'home', label: 'Home', asset: 'assets/home-icon.png', page: 'HomePage', width: 80 },
    { id: 'library', label: 'Library', asset: 'assets/library-icon.png', page: 'LibraryPage', width: 85 },
    { id: 'servers', label: 'Private Servers', asset: 'assets/private-servers-icon.png', page: 'PrivateServersPage', width: 130 },
    { id: 'mods', label: 'Voidstrap Mods', asset: 'assets/voidstrap-mods-icon.png', page: 'VoidstrapModsPage', width: 135 },
    { id: 'manager', label: 'Manager', asset: 'assets/manager-icon.png', page: 'DownloadsPage', width: 90, excludePlatforms: ['macos'] },
    { id: 'extensions', label: 'Extensions', asset: 'assets/extensions-icon.png', page: 'ExtensionPage', width: 110, excludePlatforms: ['macos']},

  ] as const;

  // Automatically drops any item whose excludePlatforms list includes the current platform
  return items.filter(item => !item.excludePlatforms?.includes(currentPlatform));
};