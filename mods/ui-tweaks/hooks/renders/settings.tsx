import type { Engine, Atom } from 'voidstrap';
import { applyTopbarMode } from './topbar';
import { getSetting, setSetting, TopbarMode } from '../settings';
import { applyMiscsSettings } from '../misc'; 
import { getNavItems } from '../constants';

export const renderSettingsPage = ($: Engine) => {
  const { Box, Text, Stack, Toggle, Image, Card, Select, Spacer, Button, Canvas } = $.ui.resolve();
  // `read` and `update` are ambient helpers injected by the Voidstrap hook
  // runtime — they get/set an Atom's value through the engine's state store.
  const mode = getSetting('topbarMode');
  const stackTopbarPreview = $.window.get().width < 1400;
  const navItems = getNavItems($);

  return (
    <Box gap={12}>
      <Text text='UI Tweaks' size={30} bold={true} color='#FFFFFFFF' margin='0,0,1,0' />
      <Text text='Customise your UI.' size={13} color='#FF9E9E9E' margin='0,0,4,0' />
      <Stack direction={stackTopbarPreview ? 'column' : 'row'} align='left' gap={24}>
        <Box width={stackTopbarPreview ? 520 : 560} gap={10}>
          <Stack direction='row' gap={5} align='left' verticalAlignment='center'>
            <Image src='assets/top-bar-icon.png' width={18} height={18}></Image>
            <Text text='Top Bar' size={18} bold={true} />
          </Stack>
          <Card padding={16} background='#FF1E1E1E' cornerRadius={6} align='left' width={500}>
            <Stack direction='row' width={468} verticalAlignment='center'>
              <Stack direction='row' gap={5} verticalAlignment='center' width={264}>
                <Image src='assets/top-bar-style-icon.png' width={18} height={18}></Image>
                <Text text='Top Bar Style:' size={15} color='#FF9E9E9E'/>
              </Stack>
              <Select
                right={2}
                width={200}
                align='right'
                value={mode}
                borderThickness={1}
                options={[
                  { value: 'dropdown', label: 'Original dropdown' },
                  { value: 'labels', label: 'Buttons with text' },
                  { value: 'icons', label: 'Icons only' },
                ]}
                onChange={(val) => {
                  const selectedMode = val as TopbarMode;
                  setSetting('topbarMode', selectedMode);
                  applyTopbarMode($, selectedMode);
                }}
              />
          </Stack>
          <Spacer margin='0,4,0,0'></Spacer>
          <Text
            text="The top bar will switch to icons only when the window's width is below 1200 px."
            size={10}
            color='#FF8B8B8B'
          />
          <Spacer margin='0,4,0,0'></Spacer>
          <Stack direction='row' gap={5} verticalAlignment='center'>
            <Image src='assets/visibility-icon.png' width={18} height={18}></Image>
            <Text text='Top Bar Visibility:' size={15} color='#FF9E9E9E' margin='0,0,0,8'/>
          </Stack>
          {/* Nav items iteration */}
          {navItems.map((item, index) => (
          <Stack direction='column' align='right'>
              {/* Only render a separator if it's NOT the first item */}
              {index > 0 && (
              <Box
                key="nav-separator"
                margin='0,6,0,6'
                width={320}
                height={1}
                background="#1FFFFFFF"
              />
              )}
              <Card key={item.id} width={348} height={40} background='#FF2B2B2B' margin='0,0,0,0' borderThickness={0} cornerRadius={6} padding={4}>
                <Canvas width={348} height={40} verticalAlignment='center'>
                  {/* Left: Icon & Label */}
                  <Stack direction='row' gap={5} verticalAlignment='center' top={6} left={6}>
                    <Image src={item.asset} width={16} height={16} />
                    <Text text={item.label} size={14} color='#FFFFFFFF' bold={true} />
                  </Stack>
                  {/* Right: Visibility Button */}
                  <Canvas width={32} height={32} align='right' left={304}>
                    <Button width={32} height={32} variant="transparent" 
                    onPress={() => {
                      const key = `hideTopBarItem_${item.id}` as `hideTopBarItem_${string}`;
                      setSetting(key, !getSetting(key));
                    }}
                    ></Button> 
                    <Image src={getSetting(`hideTopBarItem_${item.id}`) ? 'assets/hidden-icon.png' : 'assets/visible-icon.png'} width={16} height={16} left={8} top={8} hitTestVisible={false} margin={0}/>
                  </Canvas>
                </Canvas>
              </Card>
          </Stack>
          ))}
          </Card>
        </Box>
      </Stack>
      {/* Misc settings */}
      <Stack direction={stackTopbarPreview ? 'column' : 'row'} align='left' gap={24}>
        <Box width={stackTopbarPreview ? 520 : 560} gap={10}>
          <Stack direction='row' gap={5} verticalAlignment='center'>
            <Image src='assets/misc-icon.png' width={18} height={18}></Image>
            <Text text='Miscellaneous' size={18} bold={true} />
          </Stack>
          <Card padding={16} background='#FF1E1E1E' cornerRadius={6} align='left' width={500}>
          <Stack direction='row' width={468} verticalAlignment='center'>
            <Stack direction='row' gap={5} verticalAlignment='center' width={425}>
              <Image src='assets/classic-icon.png' width={18} height={18}></Image>
              <Text text='Hide the classic section:' size={15} color='#FF9E9E9E'/>
            </Stack>
          <Toggle
            key='classicmanager'
            align='right'
            checked={getSetting('classicmanager')}
            onChange={(checked) => {
              try {
                setSetting('classicmanager', checked);
                applyMiscsSettings($);
              } catch (err) {
                $.log(`UI Tweaks: failed to persist classic manager setting: ${String(err)}`);
              }
            }}
          />
          </Stack>
          <Spacer margin='0,4,0,0'></Spacer>
          <Text
            text='Note: This will remove the classic section in the manager tab.'
            size={10}
            color='#FF8B8B8B'
          />
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};