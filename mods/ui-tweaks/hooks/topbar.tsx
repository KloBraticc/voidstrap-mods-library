import type { Engine } from 'voidstrap';
import type { TopbarMode } from './constants';
import { topbarMode } from './state';
import { navItems } from './constants';

export const applyTopbarMode = ($: Engine, mode: TopbarMode) => {
  $.ui.detach('topbar-nav-buttons');
  $.ui.undo('topbar-margin');
  $.ui.undo('hide-pages-button');

  $.ui.rule({
    id: 'ui-tweaks-topbar-margin',
    target: { name: 'TopNavPanel' },
    set: { margin: '8,2,0,0' }
  });

  if (mode === 'dropdown') {
    $.ui.detach('ui-tweaks-topbar-nav-buttons');
    $.ui.undo('ui-tweaks-hide-pages-button');
    return;
  }

  $.ui.rule({
    id: 'ui-tweaks-hide-pages-button',
    target: { name: 'PagesMenuButton' },
    set: { hidden: true }
  });
  $.ui.attach({
    id: 'ui-tweaks-topbar-nav-buttons',
    anchor: 'TopNavPanel',
    placement: 'end'
  });
};

export const renderTopbar = ($: Engine) => {
  const { Stack, Box, Canvas, Button, Image, Text } = $.ui.resolve();
  const mode = read($, topbarMode);
  const compact = mode === 'icons' || (mode === 'labels' && $.window.get().width < 1200);

  return (
    <Stack
      direction="row"
      gap={compact ? 1 : 5}
      width={compact ? 180 : 620}
      height={32}
    >
      <Box
        key="nav-separator"
        width={1}
        height={18}
        margin="7,0"
        background="#1FFFFFFF"
      />
      {navItems.map(item => (
        <Canvas key={item.id} width={compact ? 32 : item.width} height={32}>
          <Button
            key={item.id + '-press'}
            tooltip={item.label}
            width={compact ? 32 : item.width}
            height={32}
            variant="transparent"
            onPress={() => $.nav.open(item.page)}
          />
          <Image
            key={item.id + '-icon'}
            src={item.asset}
            width={15}
            height={15}
            margin="0"
            verticalAlignment="center"
            left={8}
            top={8}
            hitTestVisible={false}
          />
          {!compact && (
            <Text
              key={item.id + '-label'}
              text={item.label}
              size={13.5}
              left={30}
              top={8}
              hitTestVisible={false}
            />
          )}
        </Canvas>
      ))}
    </Stack>
  );
};
