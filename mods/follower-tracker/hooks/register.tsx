import type { Register } from 'voidstrap';

// count: -1 = loading, -2 = not signed in, -3 = couldn't load
const count = atom('count', -1);
// followers gained (+) or lost (-) since Voidstrap was opened
const delta = atom('delta', 0);

const GREEN = '#4CAF50';
const RED = '#E5534B';
const REFRESH_MS = 60000;

function fmt(n: number): string {
  const s = String(Math.abs(n));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s.charAt(i);
  }
  return (n < 0 ? '-' : '') + out;
}

function noun(n: number): string {
  return Math.abs(n) === 1 ? 'follower' : 'followers';
}

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    let userId = 0;
    let baseline = -1;
    let lastSeen = -1;

    const refresh = async () => {
      try {
        const me = await $.roblox.account();
        if (!me.signedIn || !me.userId) {
          $.state.set('count', -2);
          return;
        }

        // Switched accounts? Start tracking fresh.
        if (me.userId !== userId) {
          userId = me.userId;
          baseline = -1;
          lastSeen = -1;
        }

        const r = await $.roblox.request(
          'https://friends.roblox.com/v1/users/' + userId + '/followers/count'
        );
        if (!r.ok) {
          if (baseline < 0) $.state.set('count', -3);
          return;
        }

        const n = Number(JSON.parse(r.text).count);
        if (isNaN(n)) return;

        const key = 'last_' + userId;
        const saved = $.store.get(key);

        if (baseline < 0) {
          // First reading this session: compare against the last time we saw it.
          baseline = n;
          if (typeof saved === 'number' && saved !== n) {
            const diff = n - saved;
            $.ui.toast(
              'Follower update',
              (diff > 0 ? 'Gained ' : 'Lost ') + fmt(Math.abs(diff)) + ' ' + noun(diff) +
                ' since last time. You now have ' + fmt(n) + '.'
            );
          }
        } else if (n > lastSeen) {
          $.ui.toast('New follower!', 'You now have ' + fmt(n) + ' ' + noun(n) + '.');
        }

        lastSeen = n;
        $.store.set(key, n);
        $.state.set('count', n);
        $.state.set('delta', n - baseline);
      } catch (err) {
        $.log('follower-tracker refresh failed: ' + err);
      }
    };

    $.ui.attach({ id: 'followers', anchor: 'TopNavBack', placement: 'before' });
    refresh();
    $.clock.every(REFRESH_MS, refresh);
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'followers' }, ($) => {
    const { Stack, Text } = $.ui.resolve();
    const n = read($, count);
    const d = read($, delta);

    let label = fmt(n) + ' ' + noun(n);
    if (n === -1) label = 'Followers...';
    if (n === -2) label = 'Sign in to track followers';
    if (n === -3) label = 'Followers unavailable';

    return (
      <Stack
        direction="row"
        gap={6}
        verticalAlignment="center"
        tooltip="Your Roblox followers. Updates every minute; the colored number is the change since Voidstrap opened."
      >
        <Text text={label} bold={true} />
        <Text
          visible={n >= 0 && d !== 0}
          text={(d > 0 ? '+' : '') + fmt(d)}
          bold={true}
          color={d > 0 ? GREEN : RED}
        />
      </Stack>
    );
  });
};
