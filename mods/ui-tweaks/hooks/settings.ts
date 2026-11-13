import { Atom, Json } from 'voidstrap';

export type TopbarMode = 'dropdown' | 'labels' | 'icons';

interface SettingsRegistry {
  topbarMode: TopbarMode;
  classicmanager: boolean;
  [key: `hideTopBarItem_${string}`]: boolean;
}

// Unified cache for all atoms (static + dynamic)
const atomCache = new Map<string, Atom<any>>();

function getDefaultValue(key: string): any {
  if (key === 'topbarMode') return 'icons';
  if (key === 'classicmanager') return false;
  if (key.startsWith('hideTopBarItem_')) return false;
  return false;
}

function getOrCreateAtom<K extends keyof SettingsRegistry>(key: K): Atom<SettingsRegistry[K]> {
  const stringKey = key as string;
  if (!atomCache.has(stringKey)) {
    const defaultVal = getDefaultValue(stringKey);
    const stored = $.store.get(`ui-tweaks.settings.${stringKey}`);
    atomCache.set(stringKey, atom(`ui-tweaks.settings.${stringKey}`, stored ?? defaultVal));
  }
  return atomCache.get(stringKey)!;
}

const settingsAtoms: { [K in keyof SettingsRegistry]: Atom<SettingsRegistry[K]> } = {
  topbarMode: atom<TopbarMode>('ui-tweaks.settings.topbarMode', ($.store.get('ui-tweaks.settings.topbarMode') as TopbarMode) ?? 'icons'),
  classicmanager: atom<boolean>('ui-tweaks.settings.classicmanager', ($.store.get('ui-tweaks.settings.classicmanager') as boolean) ?? false),
};

export function getSetting<K extends keyof SettingsRegistry>(key: K): SettingsRegistry[K] {
  return read($, getOrCreateAtom(key));
}

export function setSetting<K extends keyof SettingsRegistry>(key: K, value: SettingsRegistry[K]): void {
  const atomInstance = getOrCreateAtom(key);
  update($, atomInstance, () => value);
  $.store.set(atomInstance.ref, value as Json);
}