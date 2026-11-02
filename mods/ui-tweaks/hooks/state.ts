import type { TopbarMode } from './types';
import type { Atom } from 'voidstrap';

export const topbarMode: Atom<TopbarMode> = atom<TopbarMode>('topbarMode', 'labels');