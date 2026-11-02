import type { TopbarMode } from './types';

export const applyTopbarMode = ($: any, mode: TopbarMode) => {
  $.ui.rule({
    id: 'topbar-margin',
    target: { name: 'TopNavPanel' },
    set: { margin: '8,0,0,0' }
  });

  if (mode === 'dropdown') {
    $.ui.detach('topbar-nav-buttons');
    $.ui.undo('hide-pages-button');
    return;
  }

  $.ui.rule({
    id: 'hide-pages-button',
    target: { name: 'PagesMenuButton' },
    set: { hidden: true }
  });
  $.ui.attach({
    id: 'topbar-nav-buttons',
    anchor: 'TopNavPanel',
    placement: 'end'
  });
};