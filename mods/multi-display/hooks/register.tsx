import type { Register } from 'voidstrap';

const showFfFlags = atom('multiDisplayShowFfFlags', true);
const showModsRunning = atom('multiDisplayShowModsRunning', true);
const showRobloxStatus = atom('multiDisplayShowRobloxStatus', true);
const showSessionTime = atom('multiDisplayShowSessionTime', true);
const sessionSeconds = atom('multiDisplaySessionSeconds', 0);
const robloxRunning = atom('multiDisplayRobloxRunning', false);

let refreshTimer = 0;

const toggleKeys: Array<[string, import('voidstrap').Atom<boolean>]> = [
  ['multiDisplayShowFfFlags', showFfFlags],
  ['multiDisplayShowModsRunning', showModsRunning],
  ['multiDisplayShowRobloxStatus', showRobloxStatus],
  ['multiDisplayShowSessionTime', showSessionTime],
];

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    for (const [key, target] of toggleKeys) {
      const saved = $.store.get(key);
      if (typeof saved === 'boolean') {
        update($, target, () => saved);
      }
    }

    $.sidebar.addPage({
      id: 'multi-display-settings',
      title: 'Multi Display',
      icon: 'Settings24',
      section: 'Configuration',
    });

    $.ui.attach({ id: 'multi-display', anchor: 'TopNavBack', placement: 'before' });

    const tick = () => {
      update($, sessionSeconds, (s) => s + 1);
      try {
        const st = $.roblox.status();
        update($, robloxRunning, () => st.isRunning);
      } catch (err) {
        $.log(`Multi Display: roblox.status failed: ${String(err)}`);
      }
    };
    refreshTimer = $.clock.every(1000, tick);

    return next(e);
  });

  on('session.end', ($, e, next) => {
    if (refreshTimer > 0) {
      $.clock.cancel(refreshTimer);
      refreshTimer = 0;
    }
    return next(e);
  });

  on('ui.render', { component: 'Page', requestId: 'multi-display-settings' }, ($) => {
    const { Box, Stack, Text, Toggle, Card } = $.ui.resolve();
    return (
      <Box gap={12}>
        <Text text="Multi Display" size={24} bold={true} color="#FFFFFFFF" margin="0,0,4,0" />
        <Text text="Toggle which stats show as separate pills in the top bar." size={13} color="#FF9E9E9E" margin="0,0,8,0" />
        <Card>
          <Stack direction="column" gap={8}>
            <Toggle
              key="showFfFlags"
              label="FastFlag count"
              checked={read($, showFfFlags)}
              onChange={(checked) => {
                update($, showFfFlags, () => checked);
                $.store.set('multiDisplayShowFfFlags', checked);
              }}
            />
            <Toggle
              key="showModsRunning"
              label="Mods running"
              checked={read($, showModsRunning)}
              onChange={(checked) => {
                update($, showModsRunning, () => checked);
                $.store.set('multiDisplayShowModsRunning', checked);
              }}
            />
            <Toggle
              key="showRobloxStatus"
              label="Roblox status"
              checked={read($, showRobloxStatus)}
              onChange={(checked) => {
                update($, showRobloxStatus, () => checked);
                $.store.set('multiDisplayShowRobloxStatus', checked);
              }}
            />
            <Toggle
              key="showSessionTime"
              label="Session time"
              checked={read($, showSessionTime)}
              onChange={(checked) => {
                update($, showSessionTime, () => checked);
                $.store.set('multiDisplayShowSessionTime', checked);
              }}
            />
          </Stack>
        </Card>
      </Box>
    );
  });

  on('ui.render', { component: 'Widget', requestId: 'multi-display' }, ($) => {
    const { Box, Text, Card, Image } = $.ui.resolve();

    const scale = Number($.settings.get('UiCornerScale') || 1.5);
    const radius = Math.max(8, Math.round(scale * 10));

    const pill = (iconSrc: string, label: string, value: string) => (
      <Card
        direction="row"
        gap={6}
        padding="10,4"
        margin="0,0,6,0"
        cornerRadius={radius}
        background="#12FFFFFF"
        borderBrush="#22FFFFFF"
        borderThickness={1}
        verticalAlignment="center"
      >
        <Image src={iconSrc} width={15} height={15} margin="0" verticalAlignment="center" />
        <Text text={value} bold={true} size={12} color="#FFEDEDED" margin="0" verticalAlignment="center" wrap={false} />
        <Text text={label} size={11} color="#FF9E9E9E" margin="0" verticalAlignment="center" wrap={false} />
      </Card>
    );

    const pills: Array<import('voidstrap').Node> = [];
    if (read($, showFfFlags)) {
      pills.push(pill('fflag.png', 'FF', String(Object.keys($.fastFlags.getAll()).length)));
    }
    if (read($, showModsRunning)) {
      pills.push(pill('mods.png', 'Mods', String($.sidebar.get().pages.filter((p) => !!p.plugin).length)));
    }
    if (read($, showRobloxStatus)) {
      pills.push(pill('rblx.png', 'Roblox', read($, robloxRunning) ? 'Running' : 'Stopped'));
    }
    if (read($, showSessionTime)) {
      const s = read($, sessionSeconds);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      pills.push(pill('session.png', 'Session', `${h}h ${m % 60}m ${s % 60}s`));
    }

    if (pills.length === 0) {
      return null;
    }
    return (
      <Box direction="row" gap={6} align="center">
        {pills}
      </Box>
    );
  });
};
