import type { Engine, Register } from 'voidstrap';

const balance = atom('robux-balance', -1);
const accountName = atom('robux-account-name', 'Checking Roblox account…');
const accountStatus = atom('robux-account-status', 'Loading…');
const fakeMode = atom('robux-fake-mode', false);
const fakeAmount = atom('robux-fake-amount', 123456);
const textColor = atom('robux-text-color', '#F4C542');
const colorDraft = atom('robux-color-draft', '#F4C542');

const colorBrush = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex) ? '#FF' + hex.slice(1) : '#FFF4C542';
const formatRobux = (value: number) => Math.max(0, Math.floor(value)).toLocaleString();


const persistFakeMode = ($: Engine, value: boolean) => {
  update($, fakeMode, () => value);
  $.store.set('fakeMode', value);
};

const persistFakeAmount = ($: Engine, value: number) => {
  const safe = Math.max(0, Math.min(999999999, Math.floor(value)));
  update($, fakeAmount, () => safe);
  $.store.set('fakeAmount', safe);
};

const persistTextColor = ($: Engine, value: string) => {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return false;
  update($, textColor, () => value.toUpperCase());
  update($, colorDraft, () => value.toUpperCase());
  $.store.set('textColor', value.toUpperCase());
  return true;
};

export const register: Register = (on) => {
  let busy = false;
  let timerId = 0;

  const restoreSettings = ($: Engine) => {
    const savedFake = $.store.get('fakeMode');
    const savedAmount = $.store.get('fakeAmount');
    const savedColor = $.store.get('textColor');

    if (typeof savedFake === 'boolean') update($, fakeMode, () => savedFake);
    if (typeof savedAmount === 'number' && Number.isFinite(savedAmount)) {
      update($, fakeAmount, () => Math.max(0, Math.min(999999999, Math.floor(savedAmount))));
    }
    if (typeof savedColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(savedColor)) {
      update($, textColor, () => savedColor.toUpperCase());
      update($, colorDraft, () => savedColor.toUpperCase());
    }
  };

  const refreshBalance = async ($: Engine) => {
    if (busy || read($, fakeMode)) return;
    busy = true;
    update($, accountStatus, () => 'Checking your Roblox account…');

    try {
      const account = await $.roblox.account();
      if (!account.signedIn) {
        update($, balance, () => -1);
        update($, accountName, () => 'No Roblox account connected');
        update($, accountStatus, () => 'Connect a Roblox account in Voidstrap to show your live balance.');
        return;
      }

      const name = account.displayName || account.username || 'Roblox account';
      update($, accountName, () => 'Connected as ' + name);

      const response = await $.roblox.request('https://economy.roblox.com/v1/user/currency');
      if (!response.ok) {
        update($, accountStatus, () => 'Balance request failed (' + response.status + '). Check Roblox account access.');
        return;
      }

      const data = JSON.parse(response.text);
      if (!data || typeof data.robux !== 'number' || !Number.isFinite(data.robux) || data.robux < 0) {
        update($, accountStatus, () => 'Roblox returned an unexpected balance response.');
        return;
      }

      update($, balance, () => Math.floor(data.robux));
      update($, accountStatus, () => 'Live balance updated. Refreshes every 30 seconds.');
    } catch (error) {
      update($, accountStatus, () => 'Could not read the balance. Approve Roblox account access in Voidstrap.');
      $.log('Robux balance refresh failed: ' + String(error));
    } finally {
      busy = false;
    }
  };

  on('session.start', ($, e, next) => {
    restoreSettings($);
    $.sidebar.addPage({ id: 'robux', title: 'Robux', icon: 'Money', section: 'More' });
    // Same slot used by friends-display. When that mod is present, these chips sit together;
    // when it is absent, this chip occupies its slot beside the Back button.
    $.ui.attach({ id: 'robux-display', anchor: 'TopNavBack', placement: 'before' });

    if (timerId > 0) $.clock.cancel(timerId);
    void refreshBalance($);
    timerId = $.clock.every(30000, () => refreshBalance($));
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
    if (!read($, fakeMode)) void refreshBalance($);
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'robux-display' }, ($) => {
    const { Card, Text } = $.ui.resolve();
    const isFake = read($, fakeMode);
    const currentBalance = read($, balance);
    const amount = isFake
      ? formatRobux(read($, fakeAmount))
      : currentBalance >= 0 ? formatRobux(currentBalance) : '—';
    const label = isFake ? 'FAKE R$ ' + amount : 'R$ ' + amount;
    const tooltip = isFake
      ? 'FAKE demo balance. This is local display only, not your Roblox balance.'
      : read($, accountStatus);

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
        tooltip={tooltip}
      >
        <Text
          text={label}
          bold={true}
          size={12}
          color={colorBrush(read($, textColor))}
          margin="0"
          verticalAlignment="center"
          wrap={false}
        />
      </Card>
    );
  });

  on('ui.render', { component: 'Page', requestId: 'robux' }, ($) => {
    const { Box, Text, Badge, Divider, Toggle, NumberInput, TextInput, Button } = $.ui.resolve();
    const isFake = read($, fakeMode);
    const shownBalance = isFake ? read($, fakeAmount) : read($, balance);
    const shownBalanceText = shownBalance >= 0 ? 'R$ ' + formatRobux(shownBalance) : 'R$ —';

    return (
      <Box direction="column" gap={14} padding={20}>
        <Box direction="row" gap={10} align="center">
          <Text text="Robux display" size={24} bold={true} />
          <Badge text={isFake ? 'FAKE DEMO' : 'LIVE'} variant={isFake ? 'warning' : 'success'} />
        </Box>

        <Text text={read($, accountName)} dim={true} wrap={true} />
        <Text text={shownBalanceText} size={28} bold={true} color={colorBrush(read($, textColor))} />
        <Text text={read($, accountStatus)} dim={true} wrap={true} />
        <Divider />

        <Toggle
          key="fake-mode"
          label="Fake balance (local demo mode)"
          checked={isFake}
          onChange={(value) => {
            persistFakeMode($, value);
            if (!value) void refreshBalance($);
          }}
        />

        <Text text="Fake mode changes only the number shown in this launcher. The chip is labeled FAKE and never changes your Roblox account." dim={true} wrap={true} />

        <NumberInput
          key="fake-amount"
          label="Fake Robux amount"
          value={read($, fakeAmount)}
          min={0}
          max={999999999}
          step={100}
          disabled={!isFake}
          onChange={(value) => persistFakeAmount($, value)}
        />

        <Text text="Text color (hex)" bold={true} />
        <TextInput
          key="text-color"
          value={read($, colorDraft)}
          placeholder="#F4C542"
          onChange={(value) => update($, colorDraft, () => value)}
          onSubmit={(value) => {
            if (!persistTextColor($, value)) {
              $.ui.toast('Invalid color', 'Enter a hex color such as #F4C542.');
            }
          }}
        />
        <Text text={'Preview: ' + (isFake ? 'FAKE ' : '') + shownBalanceText} size={18} bold={true} color={colorBrush(read($, textColor))} />

        <Button
          key="refresh-now"
          label="Refresh live balance now"
          variant="secondary"
          disabled={isFake}
          onPress={() => refreshBalance($)}
        />
        <Text text="Live mode reads your authenticated Roblox balance and refreshes every 30 seconds. This mod requests read-only Roblox account access." dim={true} wrap={true} />
      </Box>
    );
  });
};
