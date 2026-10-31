import type { Register } from 'voidstrap';

export const register: Register = (on, options) => {
  on('session.start', ($, e, next) => {
    const showNotice = options.showNotice === true;
    $.ui.rule({
      id: 'version-visibility',
      target: { name: 'InfoBarRoot' },
      set: { hidden: !showNotice }
    });
    return next(e);
  });
};
