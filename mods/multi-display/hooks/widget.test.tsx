import { test, expect, mod } from 'voidstrap/testing';

test('renders multi-display widgets and mod page', () => {
  mod.emit('session.start', { source: 'startup' });
  const widget = mod.emit('ui.render', {
    component: 'Widget',
    requestId: 'multi-display',
    plugin: 'multi-display',
    surface: 'desktop',
  });
  expect(widget).toBeTruthy();

  const page = mod.emit('ui.render', {
    component: 'Page',
    requestId: 'multi-display-settings',
    plugin: 'multi-display',
    surface: 'desktop',
  });
  expect(page).toBeTruthy();
});
