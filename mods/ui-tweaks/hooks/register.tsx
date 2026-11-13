import type { Register } from 'voidstrap';
import { applyTopbarMode, renderTopbar } from './renders/topbar';
import { renderSettingsPage } from './renders/settings';
import { getSetting } from './settings';
import { applyMiscsSettings} from './misc';

const DEFAULT_TOPBAR_MODE = 'icons' as const;

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {

    $.modpages.add({
      id: 'ui-change-settings',
      title: 'UI Tweaks',
      icon: 'Settings24',
    });

    applyMiscsSettings($);
    applyTopbarMode($, getSetting('topbarMode') ?? DEFAULT_TOPBAR_MODE);
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
