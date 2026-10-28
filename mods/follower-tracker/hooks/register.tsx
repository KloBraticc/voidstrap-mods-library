import type { Register, Engine } from 'voidstrap';

// count: -1 = loading, -2 = not signed in, -3 = couldn't load
const count = atom('count', -1);
// followers gained (+) or lost (-) since Voidstrap was opened
const delta = atom('delta', 0);

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

async function refresh($: Engine) {
  try {
    const me = await $.roblox.account();
    if (!me.signedIn || !me.userId) {
      $.state.set('count', -2);
      return;
    }

    // Switched accounts? Start tracking fresh.
    if ($.state.get('userId') !== me.userId) {
      $.state.set('userId', me.userId);
      $.state.set('baseline', -1);
      $.state.set('lastSeen', -1);
    }

    const r = await $.roblox.request(
      'https://friends.roblox.com/v1/users/' + me.userId + '/followers/count'
    );
    const baseline = Number($.state.get('baseline'));
    if (!r.ok) {
      if (baseline < 0) $.state.set('count', -3);
      return;
    }

    const n = Number(JSON.parse(r.text).count);
    if (isNaN(n)) return;

    const key = 'last_' + me.userId;
    const saved = $.store.get(key);

    if (baseline < 0) {
      // First reading this session: compare against the last time we saw it.
      $.state.set('baseline', n);
      if (typeof saved === 'number' && saved !== n) {
        const diff = n - saved;
        $.ui.toast(
          'Follower update',
          (diff > 0 ? 'Gained ' : 'Lost ') + fmt(Math.abs(diff)) + ' ' + noun(diff) +
            ' since last time. You now have ' + fmt(n) + '.'
        );
      }
    } else if (n > Number($.state.get('lastSeen'))) {
      $.ui.toast('New follower!', 'You now have ' + fmt(n) + ' ' + noun(n) + '.');
    }

    $.state.set('lastSeen', n);
    $.store.set(key, n);
    $.state.set('count', n);
    $.state.set('delta', n - Number($.state.get('baseline')));
  } catch (err) {
    $.log('follower-tracker refresh failed: ' + err);
  }
}

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    $.state.set('baseline', -1);
    $.state.set('lastSeen', -1);
    $.ui.attach({ id: 'followers', anchor: 'TopNavBack', placement: 'before' });
    refresh($);
    $.clock.every(REFRESH_MS, () => refresh($));
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'followers' }, ($) => {
    const { Button } = $.ui.resolve();
    const n = read($, count);
    const d = read($, delta);

    let label = fmt(n) + ' ' + noun(n);
    if (n === -1) label = 'Followers...';
    if (n === -2) label = 'Sign in to track followers';
    if (n === -3) label = 'Followers unavailable';
    if (n >= 0 && d !== 0) label += ' (' + (d > 0 ? '+' : '') + fmt(d) + ')';

    // A button the same height as Back / Forward / Search / Notifications.
    // The margin lines it up with them (the top bar sits it 2px high and
    // leaves an 8px gap before Back). Pressing it refreshes right away.
    return (
      <Button
        key="followers-btn"
        label={label}
        variant="transparent"
        height={32}
        margin="0,4,-6,0"
        verticalAlignment="center"
        tooltip="Your Roblox followers. Click to refresh. The number in brackets is the change since Voidstrap opened."
        onPress={() => refresh($)}
      />
    );
  });
};
