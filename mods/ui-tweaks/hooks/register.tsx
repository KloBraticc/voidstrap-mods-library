import type { Register } from 'voidstrap';

import { topbarMode } from './state';
import { applyTopbarMode, renderTopbar } from './topbar';
import { renderSettingsPage } from './settings';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    const savedMode = $.store.get('ui-tweaks.mode') ?? 'icons';
    if (savedMode === 'dropdown' || savedMode === 'labels' || savedMode === 'icons') {
      $.state.set(topbarMode.ref, savedMode);
    } else {
      $.state.set(topbarMode.ref, 'labels');
    }

    $.modpages.add({
      id: 'ui-change-settings',
      title: 'UI Tweaks',
      icon: 'Settings24',
    });

    // `read` is an ambient helper injected by the Voidstrap hook runtime — it
    // reads the current value of an Atom from the engine's state store.
    applyTopbarMode($, read($, topbarMode));
    return next(e);
  });

  on('session.end', ($, e, next) => {
    $.modpages.remove('ui-change-settings');
    return next(e);
  });


  on('ui.render', { component: 'Widget', requestId: 'ui-tweaks-topbar-nav-buttons' }, ($) => {
    return renderTopbar($);
  });

  on('ui.render', { component: 'Page', requestId: 'ui-change-settings' }, ($) => {
    return renderSettingsPage($);
  });
};
