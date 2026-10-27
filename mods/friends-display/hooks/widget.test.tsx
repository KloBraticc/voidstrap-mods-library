import { test, expect, mod } from 'voidstrap/testing';

test('renders live friend count widget and handles navigation events', () => {
  mod.emit('session.start', { source: 'startup' });
  mod.emit('page.navigate', { page: 'Home' });
  const node = mod.emit('ui.render', {
    component: 'Widget',
    requestId: 'friends',
    plugin: 'friends-display',
    surface: 'desktop',
  });
  expect(node).toBeTruthy();
});
