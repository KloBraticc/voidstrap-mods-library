import type { Register } from 'voidstrap';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.ui.open({ id: 'clock', title: 'Clock' });
    return next(e);
  });

  on('ui.render', { component: 'Pane', requestId: 'clock' }, ($) => {
    const { Box, Text } = $.ui.resolve();
    return (
      <Box>
        <Text text={'It is ' + new Date().toLocaleTimeString()} bold={true} />
      </Box>
    );
  });
};
