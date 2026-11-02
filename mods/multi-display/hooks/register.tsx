import type { Atom, Register } from 'voidstrap';

const showFfFlags = atom('multiDisplayShowFfFlags', true);
const showModsRunning = atom('multiDisplayShowModsRunning', true);
const showRobloxStatus = atom('multiDisplayShowRobloxStatus', true);
const showSessionTime = atom('multiDisplayShowSessionTime', true);
const sessionSeconds = atom('multiDisplaySessionSeconds', 0);
const robloxRunning = atom('multiDisplayRobloxRunning', false);
let robloxMode: 'player' | 'studio' = 'player';
let refreshTimer = 0;

const toggleKeys: Array<[string, Atom<boolean>]> = [
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
    robloxMode = 'player';

    $.modpages.add({
      id: 'multi-display-settings',
      title: 'Multi Display',
      icon: 'Settings24',
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

  on('roblox.launch', ($, e, next) => {
    robloxMode = e.mode;
    return next(e);
  });

  on('session.end', ($, e, next) => {
    if (refreshTimer > 0) {
      $.clock.cancel(refreshTimer);
      refreshTimer = 0;
    }
    $.modpages.remove('multi-display-settings');
    $.ui.detach('multi-display');
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
    const radius = Math.max(8, Math.round(scale * 5));

    // Responsive: merge pills when window width < 1200px
    const win = $.window.get();
    const width = win?.width ?? 1920;
    const isCompact = width < 1200;
    const isMerged = isCompact;

    // Full pill: normal size with labels
    const pill = (key: string, iconSrc: string, label: string, value: string) => (
      <Card
        key={key}
        direction="row"
        gap={6}
        padding="6,4"
        margin="4,0,4,0"
        cornerRadius={radius}
        background="#12FFFFFF"
        borderBrush="#22FFFFFF"
        borderThickness={1}
        verticalAlignment="center"
      >
        <Image src={iconSrc} width={15} height={15} margin="0" verticalAlignment="center" />
        <Text text={value} bold={true} size={12} color="#FFEDEDED" margin="0" verticalAlignment="center" wrap={false} />
        {label && <Text text={label} size={11} color="#FF9E9E9E" margin="0" verticalAlignment="center" wrap={false} />}
      </Card>
    );

    const getRobloxIcon = (isRunning: boolean, robloxMode: 'player' | 'studio'): string => {
      if (!isRunning) return 'assets/rblx-offline.png'; // gray = offline/not running
      if (robloxMode === 'studio') return 'assets/rblx-studio.png'; // orange = studio
      return 'assets/rblx-player.png'; // generic player icon
    };

    // Build pill parts based on enabled stats
    const parts: Array<import('voidstrap').Node> = [];

    if (read($, showFfFlags)) {
      const label = isCompact ? '' : 'FF';
      parts.push(pill('fflag', 'assets/fflag.png', label, String(Object.keys($.fastFlags.getAll()).length)));
    }
    if (read($, showModsRunning)) {
      const label = isCompact ? '' : 'Mods';
      parts.push(pill('mods', 'assets/mods.png', label, String($.sidebar.get().pages.filter((p) => !!p.plugin).length)));
    }
    if (read($, showRobloxStatus)) {
      const isRunning = read($, robloxRunning);
      const iconSrc = getRobloxIcon(isRunning, robloxMode);
      const statusText = isRunning ? (robloxMode === 'studio' ? 'Studio' : 'Running') : 'Offline';
      const label = isCompact ? '' : 'Roblox';
      parts.push(pill('rblx', iconSrc, label, statusText));
    }
    if (read($, showSessionTime)) {
      const secs = read($, sessionSeconds);
      const mins = Math.floor(secs / 60);
      const hrs = Math.floor(mins / 60);
      const timeText = isMerged ? (hrs + 'h ' + (mins % 60) + 'm') : (hrs + 'h ' + (mins % 60) + 'm ' + (secs % 60) + 's');
      const label = isCompact ? '' : 'Session';
      parts.push(pill('session', 'assets/session.png', label, timeText));
    }

    if (parts.length === 0) {
      return null;
    }

    // Merged: ONE single pill with icons + values
    if (isMerged) {
      const parts: Array<import('voidstrap').Node> = [];
      if (read($, showFfFlags)) {
        parts.push(
          <Box key="fflag" direction="row" gap={4} verticalAlignment="center">
            <Image src="assets/fflag.png" width={15} height={15} verticalAlignment="center" />
            <Text text={String(Object.keys($.fastFlags.getAll()).length)} bold={true} size={12} color="#FFEDEDED" verticalAlignment="center" />
          </Box>
        );
      }
      if (read($, showModsRunning)) {
        parts.push(
          <Box key="mods" direction="row" gap={4} verticalAlignment="center">
            <Image src="assets/mods.png" width={15} height={15} verticalAlignment="center" />
            <Text text={String($.sidebar.get().pages.filter((p) => !!p.plugin).length)} bold={true} size={12} color="#FFEDEDED" verticalAlignment="center" />
          </Box>
        );
      }
      if (read($, showRobloxStatus)) {
        const isRunning = read($, robloxRunning);
        const iconSrc = getRobloxIcon(isRunning, robloxMode);
        const statusText = isRunning ? (robloxMode === 'studio' ? 'Studio' : 'Running') : 'Offline';
        parts.push(
          <Box key="rblx" direction="row" gap={4} verticalAlignment="center">
            <Image src={iconSrc} width={15} height={15} verticalAlignment="center" />
            <Text text={statusText} bold={true} size={12} color="#FFEDEDED" verticalAlignment="center" />
          </Box>
        );
      }
      if (read($, showSessionTime)) {
        const secs = read($, sessionSeconds);
        const mins = Math.floor(secs / 60);
        const hrs = Math.floor(mins / 60);
        parts.push(
          <Box key="session" direction="row" gap={4} verticalAlignment="center">
            <Image src="assets/session.png" width={15} height={15} verticalAlignment="center" />
            <Text text={hrs + 'h ' + (mins % 60) + 'm'} bold={true} size={12} color="#FFEDEDED" verticalAlignment="center" />
          </Box>
        );
      }
      if (parts.length === 0) return null;
      return (
        <Card
          key="merged"
          direction="row"
          gap={10}
          padding="5,5,0,0"
          margin="4,2,4,0"
          cornerRadius={4}
          background="#1AFFFFFF"
          borderBrush="#33FFFFFF"
          borderThickness={1}
          verticalAlignment="center"
        >
          {parts}
        </Card>
      );
    }

    // Full: individual pills horizontal with labels
    return (
      <Box direction="row" gap={6} align="center">
        {parts}
      </Box>
    );
  });
};
