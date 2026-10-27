import type { Engine, Register } from 'voidstrap';

const count = atom('count', -1);

const parseCount = ($: Engine, text: string): number | null => {
  try {
    const data = JSON.parse(text);
    if (data && typeof data.count === 'number' && Number.isFinite(data.count) && data.count >= 0) {
      return data.count;
    }
  } catch (err) {
    $.log(`Failed to parse friend count JSON: ${String(err)}`);
  }
  return null;
};

export const register: Register = (on) => {
  let busy = false;
  let timerId = 0;

  const refresh = async ($: Engine) => {
    if (busy) return;
    busy = true;
    try {
      try {
        const r = await $.roblox.request('https://friends.roblox.com/v1/my/friends/count');
        if (r && r.ok) {
          const parsed = parseCount($, r.text);
          if (parsed !== null) {
            if (read($, count) !== parsed) {
              $.state.set('count', parsed);
            }
            return;
          }
        }
      } catch (err) {
        $.log(`Primary friend count request failed: ${String(err)}`);
      }

      try {
        const me = await $.roblox.account();
        if (me && typeof me.userId === 'number' && me.userId > 0) {
          const pub = await $.roblox.request(`https://friends.roblox.com/v1/users/${me.userId}/friends/count`);
          if (pub && pub.ok) {
            const parsed = parseCount($, pub.text);
            if (parsed !== null && read($, count) !== parsed) {
              $.state.set('count', parsed);
            }
          }
        }
      } catch (err) {
        $.log(`Fallback friend count request failed: ${String(err)}`);
      }
    } finally {
      busy = false;
    }
  };

  on('session.start', ($, e, next) => {
    $.ui.attach({ id: 'friends', anchor: 'TopNavBack', placement: 'before' });
    void refresh($);
    if (timerId > 0) {
      $.clock.cancel(timerId);
    }
    timerId = $.clock.every(5000, () => refresh($));
    return next(e);
  });

  on('session.end', ($, e, next) => {
    if (timerId > 0) {
      $.clock.cancel(timerId);
      timerId = 0;
    }
    return next(e);
  });

  on('page.navigate', ($, e, next) => {
    void refresh($);
    return next(e);
  });

  on('game.join', ($, e, next) => {
    void refresh($);
    return next(e);
  });

  on('game.leave', ($, e, next) => {
    void refresh($);
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'friends' }, ($) => {
    const { Card, Image, Text } = $.ui.resolve();
    const raw = read($, count);
    const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : -1;
    const display = n < 0 ? '...' : n.toLocaleString();
    const tip = n < 0 ? `Friend's Display: Loading Roblox friends...` : `Friend's Display: ${n.toLocaleString()} Roblox friends (live)`;

    return (
      <Card
        direction="row"
        gap={6}
        padding="10,4"
        margin="0,0,6,0"
        cornerRadius={12}
        background="#12FFFFFF"
        borderBrush="#22FFFFFF"
        borderThickness={1}
        verticalAlignment="center"
        tooltip={tip}
      >
        <Image
          src="icon.ico"
          width={15}
          height={15}
          margin="0"
          verticalAlignment="center"
        />
        <Text
          text={display}
          bold={true}
          size={12}
          color="#FFEDEDED"
          margin="0"
          verticalAlignment="center"
          wrap={false}
        />
        <Text
          text="Friends"
          size={11.5}
          color="#FF9E9E9E"
          margin="0"
          verticalAlignment="center"
          wrap={false}
        />
      </Card>
    );
  });
};
