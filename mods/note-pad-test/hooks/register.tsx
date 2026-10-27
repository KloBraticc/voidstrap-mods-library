import type { Register } from 'voidstrap';

const note = atom('note', '');

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.sidebar.addPage({ id: 'notes', title: 'Notes', icon: 'Note24', section: 'Core' });
    return next(e);
  });

  on('ui.render', { component: 'Page', requestId: 'notes' }, ($) => {
    const { Box, Text, TextInput } = $.ui.resolve();
    const text = read($, note);
    return (
      <Box gap={8}>
        <TextInput key="note" value={text} multiline={true} onChange={v => $.state.set('note', v)} />
        <Text text={text.length + ' characters'} dim={true} />
      </Box>
    );
  });
};
