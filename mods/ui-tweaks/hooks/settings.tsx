import type { TopbarMode } from './types';
import { topbarMode } from './state';
import { applyTopbarMode } from './topbar';

export const renderSettingsPage = ($: any) => {
  const { Box, Text, Stack, Button, Card } = $.ui.resolve();
  const mode = read($, topbarMode);
  const stackTopbarPreview = $.window.get().width < 1400;

  const chooseMode = (nextMode: TopbarMode) => {
    update($, topbarMode, () => nextMode);
    $.store.set('ui-tweaks.mode', nextMode);
    applyTopbarMode($, nextMode);
  };

  return (
    <Box gap={12}>
      <Text text="UI Tweaks" size={30} bold={true} color="#FFFFFFFF" margin="0,0,4,0" />

      <Card>
        <Stack direction={stackTopbarPreview ? 'column' : 'row'} gap={24}>
          <Box width={stackTopbarPreview ? 520 : 560} gap={10}>
            <Text text="Top Bar" size={20} bold={true} />
            <Text text="Choose how the top navigation is displayed." size={13} color="#FF9E9E9E" />
            <Stack direction="row" gap={8} wrap={true}>
              <Button
                key="dropdown"
                label="Original dropdown"
                tooltip="Use the original dropdown menu in the top bar."
                width={160}
                variant={mode === 'dropdown' ? 'primary' : 'secondary'}
                onPress={() => chooseMode('dropdown')}
              />
              <Button
                key="labels"
                label="Buttons with text"
                tooltip="Show the five destinations as labeled buttons. Below 1200 px, they switch to icons."
                width={160}
                variant={mode === 'labels' ? 'primary' : 'secondary'}
                onPress={() => chooseMode('labels')}
              />
              <Button
                key="icons"
                label="Icons only"
                tooltip="Show compact icon-only navigation buttons."
                width={160}
                variant={mode === 'icons' ? 'primary' : 'secondary'}
                onPress={() => chooseMode('icons')}
              />
            </Stack>
            <Text
              text="Buttons switch to icons only below 1200 px when text mode is selected."
              size={12}
              color="#FF9E9E9E"
            />
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};