import type { Register } from 'voidstrap';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.ui.open({ id: 'hi', title: 'Hi' });
    return next(e);
  });

  on('ui.render', { component: 'Pane', requestId: 'hi' }, ($) => {
    const { Text } = $.ui.resolve();
    return <Text text="Hello from the library" />;
  });
};
