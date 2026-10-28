import type { Engine, Register } from 'voidstrap';

const balance = atom('robux-balance', -1);
const accountName = atom('robux-account-name', 'Checking Roblox account…');
const accountStatus = atom('robux-account-status', 'Loading…');
const fakeMode = atom('robux-fake-mode', false);
const fakeAmount = atom('robux-fake-amount', 123456);
const showPending = atom('robux-show-pending', false);
const pendingBalance = atom('robux-pending-balance', -1);
const pendingStatus = atom('robux-pending-status', 'Pending balance not loaded.');
const textColor = atom('robux-text-color', '#FFFFFF');
const colorDraft = atom('robux-color-draft', '#FFFFFF');

const colorBrush = (hex: string) => /^#[0-9a-fA-F]{6}$/.test(hex) ? '#FF' + hex.slice(1) : '#FFFFFFFF';
const formatRobux = (value: number) => Math.max(0, Math.floor(value)).toLocaleString('en-US');


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
    const savedShowPending = $.store.get('showPending');
    const savedColor = $.store.get('textColor');

    if (typeof savedFake === 'boolean') update($, fakeMode, () => savedFake);
    if (typeof savedShowPending === 'boolean') update($, showPending, () => savedShowPending);
    if (typeof savedAmount === 'number' && Number.isFinite(savedAmount)) {
      update($, fakeAmount, () => Math.max(0, Math.min(999999999, Math.floor(savedAmount))));
    }
    if (typeof savedColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(savedColor)) {
      update($, textColor, () => savedColor.toUpperCase());
      update($, colorDraft, () => savedColor.toUpperCase());
    }
  };

  const refreshPendingBalance = async ($: Engine, userId?: number) => {
    if (!read($, showPending)) return;

    if (typeof userId !== 'number' || !Number.isFinite(userId) || userId <= 0) {
      update($, pendingBalance, () => -1);
      update($, pendingStatus, () => 'Roblox did not provide an account ID for pending sales.');
      return;
    }

    update($, pendingStatus, () => 'Checking pending sales…');
    try {
      const url = 'https://economy.roblox.com/v2/users/' + userId + '/transaction-totals?timeFrame=Year&transactionType=summary';
      const response = await $.roblox.request(url);
      if (!response.ok) {
        update($, pendingBalance, () => -1);
        update($, pendingStatus, () => 'Pending sales request failed (' + response.status + ').');
        return;
      }

      const data = JSON.parse(response.text);
      const total = typeof data?.pendingRobuxTotal === 'number'
        ? data.pendingRobuxTotal
        : data?.pendingRobux;
      if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
        update($, pendingBalance, () => -1);
        update($, pendingStatus, () => 'Roblox returned no pending sales total.');
        return;
      }

      update($, pendingBalance, () => Math.floor(total));
      update($, pendingStatus, () => 'Pending sales total updated. Refreshes every 30 seconds.');
    } catch (error) {
      update($, pendingBalance, () => -1);
      update($, pendingStatus, () => 'Could not read pending sales.');
      $.log('Pending Robux refresh failed: ' + String(error));
    }
  };

  const refreshBalance = async ($: Engine) => {
    const isFake = read($, fakeMode);
    const includePending = read($, showPending);
    if (busy || (isFake && !includePending)) return;
    busy = true;
    if (!isFake) update($, accountStatus, () => 'Checking your Roblox account…');

    try {
      const account = await $.roblox.account();
      if (!account.signedIn) {
        if (!isFake) {
          update($, balance, () => -1);
          update($, accountName, () => 'No Roblox account connected');
          update($, accountStatus, () => 'Connect a Roblox account in Voidstrap to show your live balance.');
        }
        if (includePending) {
          update($, pendingBalance, () => -1);
          update($, pendingStatus, () => 'Connect a Roblox account in Voidstrap to show pending sales.');
        }
        return;
      }

      if (!isFake) {
        const name = account.displayName || account.username || 'Roblox account';
        update($, accountName, () => 'Connected as ' + name);

        const response = await $.roblox.request('https://economy.roblox.com/v1/user/currency');
        if (!response.ok) {
          update($, accountStatus, () => 'Balance request failed (' + response.status + '). Check Roblox account access.');
        } else {
          const data = JSON.parse(response.text);
          if (!data || typeof data.robux !== 'number' || !Number.isFinite(data.robux) || data.robux < 0) {
            update($, accountStatus, () => 'Roblox returned an unexpected balance response.');
          } else {
            update($, balance, () => Math.floor(data.robux));
            update($, accountStatus, () => 'Live balance updated. Refreshes every 30 seconds.');
          }
        }
      }

      if (includePending) await refreshPendingBalance($, account.userId);
    } catch (error) {
      if (!isFake) update($, accountStatus, () => 'Could not read the balance. Approve Roblox account access in Voidstrap.');
      if (includePending) {
        update($, pendingBalance, () => -1);
        update($, pendingStatus, () => 'Could not read pending sales.');
      }
      $.log('Robux refresh failed: ' + String(error));
    } finally {
      busy = false;
    }
  };
  on('session.start', ($, e, next) => {
    restoreSettings($);
    $.sidebar.addPage({ id: 'robux', title: 'Robux', icon: 'Money24', section: 'More' });
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
    if (!read($, fakeMode) || read($, showPending)) void refreshBalance($);
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: 'robux-display' }, ($) => {
    const { Box, Card, Image, Text } = $.ui.resolve();
    const isFake = read($, fakeMode);
    const currentBalance = read($, balance);
    const displayPending = read($, showPending);
    const currentPendingBalance = read($, pendingBalance);
    const amount = isFake
      ? formatRobux(read($, fakeAmount))
      : currentBalance >= 0 ? formatRobux(currentBalance) : '—';

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
        <Image
          src="icon.ico"
          width={15}
          height={15}
          margin="0"
          verticalAlignment="center"
        />
        {isFake && <Text text="FAKE" bold={true} size={10} color="#FFFFB547" margin="0" verticalAlignment="center" wrap={false} />}
        <Text
          text={amount}
          bold={true}
          size={12}
          color={colorBrush(read($, textColor))}
          margin="0"
          verticalAlignment="center"
          wrap={false}
        />
        {displayPending && currentPendingBalance >= 0 && (
          <Box direction="row" gap={2} align="center">
            <Text text="(" size={9} dim={true} margin="0" verticalAlignment="center" />
            <Image src="icon.ico" width={9} height={9} margin="0" verticalAlignment="center" />
            <Text text={formatRobux(currentPendingBalance)} size={10} dim={true} margin="0" verticalAlignment="center" wrap={false} />
            <Text text=" pending)" size={9} dim={true} margin="0" verticalAlignment="center" wrap={false} />
          </Box>
        )}
      </Card>
    );
  });

  on('ui.render', { component: 'Page', requestId: 'robux' }, ($) => {
    const { Box, Image, Text, Badge, Divider, Toggle, NumberInput, TextInput, Button } = $.ui.resolve();
    const isFake = read($, fakeMode);
    const shownBalance = isFake ? read($, fakeAmount) : read($, balance);
    const shownBalanceText = shownBalance >= 0 ? formatRobux(shownBalance) : '—';
    const showPendingValue = read($, showPending);
    const shownPendingBalance = read($, pendingBalance);

    return (
      <Box direction="column" gap={14} padding={20}>
        <Box direction="row" gap={10} align="center">
          <Text text="Robux display" size={24} bold={true} />
          <Badge text={isFake ? 'FAKE DEMO' : 'LIVE'} variant={isFake ? 'warning' : 'success'} />
        </Box>

        <Text text={read($, accountName)} dim={true} wrap={true} />
        <Box direction="row" gap={8} align="center">
          <Image src="icon.ico" width={30} height={30} margin="0" verticalAlignment="center" />
          <Text text={shownBalanceText} size={28} bold={true} color={colorBrush(read($, textColor))} />
        </Box>
        <Text text={read($, accountStatus)} dim={true} wrap={true} />
        <Divider />

        <Toggle
          key="fake-mode"
          label="Fake balance (local demo mode)"
          checked={isFake}
          onChange={(value) => {
            persistFakeMode($, value);
            void refreshBalance($);
          }}
        />

        <Text text="Fake mode changes only the number shown in this launcher. The chip is labeled FAKE and never changes your Roblox account." dim={true} wrap={true} />

        <Toggle
          key="pending-display"
          label="Show pending Robux from sales"
          checked={showPendingValue}
          onChange={(value) => {
            update($, showPending, () => value);
            $.store.set('showPending', value);
            if (value) {
              update($, pendingStatus, () => 'Checking pending sales…');
              void refreshBalance($);
            } else {
              update($, pendingBalance, () => -1);
              update($, pendingStatus, () => 'Pending display is off.');
            }
          }}
        />
        <Text text="When enabled, shows Robux from recent sales that Roblox has not released yet. Refreshes every 30 seconds." dim={true} wrap={true} />
        {showPendingValue && (
          <Box direction="column" gap={4}>
            <Box direction="row" gap={6} align="center">
              <Text text="(" size={13} dim={true} />
              <Image src="icon.ico" width={16} height={16} margin="0" verticalAlignment="center" />
              <Text text={shownPendingBalance >= 0 ? formatRobux(shownPendingBalance) : '—'} size={18} bold={true} color={colorBrush(read($, textColor))} />
              <Text text=" pending)" size={13} dim={true} />
            </Box>
            {shownPendingBalance < 0 && <Text text={read($, pendingStatus)} dim={true} wrap={true} />}
          </Box>
        )}

        {isFake ? (
          <NumberInput
            key="fake-amount"
            label="Fake Robux amount"
            value={read($, fakeAmount)}
            min={0}
            max={999999999}
            step={100}
            onChange={(value) => persistFakeAmount($, value)}
          />
        ) : (
          <Text text="Turn on Fake balance to edit the demo amount." dim={true} wrap={true} />
        )}

        <Text text="Text color (hex)" bold={true} />
        <TextInput
          key="text-color"
          value={read($, colorDraft)}
          placeholder="#FFFFFF"
          onChange={(value) => update($, colorDraft, () => value)}
          onSubmit={(value) => {
            if (!persistTextColor($, value)) {
              $.ui.toast('Invalid color', 'Enter a hex color such as #FFFFFF.');
            }
          }}
        />
        <Box direction="row" gap={6} align="center">
          <Text text={'Preview:' + (isFake ? ' FAKE' : '')} size={18} bold={true} />
          <Image src="icon.ico" width={18} height={18} margin="0" verticalAlignment="center" />
          <Text text={shownBalanceText} size={18} bold={true} color={colorBrush(read($, textColor))} />
        </Box>

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
