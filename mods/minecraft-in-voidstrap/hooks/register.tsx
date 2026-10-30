import type { Register } from 'voidstrap';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.modpages.add({ id: 'minecraft', title: 'Minecraft', icon: 'assets/icon.png', action: true });
    return next(e);
  });

  on('ui.event', { id: 'minecraft', plugin: 'minecraft-in-voidstrap', event: 'menu' }, ($) => {
    const result = $.web.open({ url: 'https://happinessad.github.io/x/26/', title: 'Minecraft' });
    if (!result.ok) $.ui.toast('Minecraft', result.reason);
  });
};
