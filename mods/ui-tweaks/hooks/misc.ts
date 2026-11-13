import type { Register, Engine } from 'voidstrap';
import { getSetting } from './settings';

export const applyMiscsSettings = ($: Engine) => {
    const showClassicManager = getSetting('classicmanager');

    if (showClassicManager) {
        $.ui.rule({
            id: 'ui-tweaks-hide-classic-section',
            target: { name: 'ClassicSection' },
            set: { hidden: true }
        });
        $.ui.rule({
            id: 'ui-tweaks-hide-classic-items',
            target: { name: 'ClassicItems' },
            set: { hidden: true }
        });
    } else {
    $.ui.undo('ui-tweaks-hide-classic-section');
    $.ui.undo('ui-tweaks-hide-classic-items');
  }
}