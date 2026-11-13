import type { Engine } from 'voidstrap';
import { getNavItems } from '../constants';
import { getSetting, TopbarMode } from '../settings'

export const applyTopbarMode = ($: Engine, mode: TopbarMode) => {
  $.ui.undo('ui-tweaks-topbar-margin');
  $.ui.undo('ui-tweaks-hide-pages-button');
  $.ui.undo('ui-tweaks-hide-extensions-button');

  $.ui.rule({
    id: 'ui-tweaks-topbar-margin',
    target: { name: 'TopNavPanel' },
    set: { margin: '8,2,0,0' }
  });

  if (mode === 'dropdown') {
    // If dropdown mode, just keep everything detached/undone
    $.ui.detach('ui-tweaks-topbar-nav-buttons');
    return;
  }

  // Otherwise, hide default buttons and attach custom nav buttons
  $.ui.rule({
    id: 'ui-tweaks-hide-pages-button',
    target: { name: 'PagesMenuButton' },
    set: { hidden: true }
  });
  //extension button
  $.ui.rule({
    id: 'ui-tweaks-hide-extensions-button',
    target: { name: 'ExtensionsTitleButton' },
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
  const mode = getSetting('topbarMode');
  const navItems = getNavItems($);
  const compact = mode === 'icons' || (mode === 'labels' && $.window.get().width < 1200);

  return (
    <Stack
      direction="row"
      gap={compact ? 1 : 5}
      width={compact ? 240 : 700}
      height={32}
    >
      <Box
        key="nav-separator"
        width={1}
        height={18}
        margin="7,0"
        background="#1FFFFFFF"
      />
      {navItems.filter((item) => !getSetting(`hideTopBarItem_${item.id}` as `hideTopBarItem_${string}`)).map((item) => (
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
              size={13}
              left={30}
              top={6}
              hitTestVisible={false}
            />
          )}
        </Canvas>
      ))}
    </Stack>
  );
};
