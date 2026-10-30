import type { Register } from 'voidstrap';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    const r = $.ui.rule({ id: 'hide-launch', target: { name: 'InstallLaunchButton' }, set: { hidden: true } });
    if (!r.ok) $.log('hide-launch failed: ' + r.errors.join(', '));
    return next(e);
  });
};
