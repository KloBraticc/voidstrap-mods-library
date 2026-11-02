import type { Register } from 'voidstrap';

import { topbarMode } from './state';
import { navItems } from './constants';
import { applyTopbarMode } from './topbar';
import { renderSettingsPage } from './settings';

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    const savedMode = $.store.get('ui-tweaks.mode');
    if (savedMode === 'dropdown' || savedMode === 'labels' || savedMode === 'icons') {
      $.state.set(topbarMode.ref, savedMode);
    } else {
      const legacyMode = $.store.get('ui-tweaks.useIndividualButtons');
      if (legacyMode === false) {
        $.state.set(topbarMode.ref, 'dropdown');
      }
    }

    $.modpages.add({
      id: 'ui-change-settings',
      title: 'UI Tweaks',
      icon: 'Settings24',
    });

    applyTopbarMode($, read($, topbarMode));
    return next(e);
  });

  on('session.end', ($, e, next) => {
    $.modpages.remove('ui-change-settings');
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'topbar-nav-buttons' }, ($) => {
    const { Stack, Box, Canvas, Button, Icon, Text } = $.ui.resolve();
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
            <Icon
              key={item.id + '-icon'}
              symbol={item.icon}
              size={16}
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
  });

  on('ui.render', { component: 'Page', requestId: 'ui-change-settings' }, ($) => {
    return renderSettingsPage($);
  });
};