import type { TopbarMode } from './constants';
import type { Atom } from 'voidstrap';

export const topbarMode: Atom<TopbarMode> = atom<TopbarMode>('topbarMode', 'labels');
