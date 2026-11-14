import { test, expect, mod } from 'voidstrap/testing';

test('page renders the title and search', () => {
  mod.emit('session.start', { source: 'startup' });
  const text = JSON.stringify(mod.renderPage('fluent-icon-browser'));
  expect(text).toContain('Fluent Icon Browser');
  expect(text).toContain('Search icons');
});

test('copy all shows the real count', () => {
  const text = JSON.stringify(mod.renderPage('fluent-icon-browser'));
  expect(text).not.toContain('{count}');
  expect(text).toContain('Copy ');
});

test('first page lists real icons and skips Empty', () => {
  const text = JSON.stringify(mod.renderPage('fluent-icon-browser'));
  expect(text).toContain('"AccessTime20"');
  expect(text).not.toContain('"Empty"');
});
