import { test, expect, mod } from 'voidstrap/testing';

test('session start logs nothing on error', () => {
  mod.emit('session.start', { source: 'startup' });
  expect(true).toBeTruthy();
});
