import type { CursorPosition, Register } from 'voidstrap';
import { getPixelFrameCount, getPixelRectsFromSvg } from './skin-vectors';

type Point = { x: number; y: number };
type Pose = 'idle' | 'alert' | 'sleeping' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
type SkinId = "ace" | "black" | "bunny" | "calico" | "default" | "eevee" | "esmeralda" | "fox" | "ghost" | "gray" | "jess" | "kina" | "lucy" | "maia" | "maria" | "mike" | "silver" | "silversky" | "snuupy" | "spirit" | "tora" | "valentine";
type Preferences = { speed: number; animationFps: number; idleRange: number; skin: SkinId };
type Scene = Point & {
  pointerX: number;
  pointerY: number;
  windowWidth: number;
  windowHeight: number;
  visible: boolean;
  pose: Pose;
  frame: number;
  clicking: boolean;
};

const SKIN_IDS = ["ace","black","bunny","calico","default","eevee","esmeralda","fox","ghost","gray","jess","kina","lucy","maia","maria","mike","silver","silversky","snuupy","spirit","tora","valentine"] as SkinId[];
const SKIN_LABELS: Record<SkinId, string> = {
  ace: "Ace",
  black: "Black",
  bunny: "Bunny",
  calico: "Calico",
  default: "Default",
  eevee: "Eevee",
  esmeralda: "Esmeralda",
  fox: "Fox",
  ghost: "Ghost",
  gray: "Gray",
  jess: "Jess",
  kina: "Kina",
  lucy: "Lucy",
  maia: "Maia",
  maria: "Maria",
  mike: "Mike",
  silver: "Silver",
  silversky: "Silver Sky",
  snuupy: "Snuupy",
  spirit: "Spirit",
  tora: "Tora",
  valentine: "Valentine"
};

const SPRITE_SIZE = 32;
const SETTINGS_PAGE = 'oneko-settings';
const OVERLAY = 'oneko-overlay';
const PREFS_KEY = 'oneko-preferences-v2';
const LEGACY_PREFS_KEY = 'oneko-preferences';
const preferences = atom<Preferences>('oneko-preferences', { speed: 60, animationFps: 6, idleRange: 48, skin: 'default' });
const scene = atom<Scene>('oneko-scene', {
  x: 0, y: 0, pointerX: 0, pointerY: 0, windowWidth: 0, windowHeight: 0,
  visible: false, pose: 'idle', frame: 0, clicking: false
});
let followTimerId: number | undefined;
let idleKickTimerId: number | undefined;
let clickAnimationTimerId: number | undefined;
let lastAnimationFrameAt: number | undefined;
let lastMovementAt: number | undefined;
let settingsPageActive = false;
let pointerInsideWindow = false;

const DEFAULT_IDLE_RANGE = 48;
const FOLLOW_INTERVAL_MS = 33;
const MAX_STEP_MS = 100;
const SPEED_BOOST = 1.25;
const IDLE_KICK_DELAY_MS = 80;
const CLICK_FEEDBACK_MS = 420;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function directionFor(dx: number, dy: number): Pose {
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'SE';
  if (angle >= 67.5 && angle < 112.5) return 'S';
  if (angle >= 112.5 && angle < 157.5) return 'SW';
  if (angle >= 157.5 || angle < -157.5) return 'W';
  if (angle >= -157.5 && angle < -112.5) return 'NW';
  if (angle >= -112.5 && angle < -67.5) return 'N';
  return 'NE';
}

function isOnekoSettingsPage(page: string): boolean {
  return page.toLowerCase().includes('oneko');
}

function cancelFollowTimer($: import('voidstrap').Engine): void {
  if (followTimerId !== undefined) {
    $.clock.cancel(followTimerId);
    followTimerId = undefined;
  }
}

function cancelIdleKickTimer($: import('voidstrap').Engine): void {
  if (idleKickTimerId !== undefined) {
    $.clock.cancel(idleKickTimerId);
    idleKickTimerId = undefined;
  }
}

function cancelClickAnimationTimer($: import('voidstrap').Engine): void {
  if (clickAnimationTimerId !== undefined) {
    $.clock.cancel(clickAnimationTimerId);
    clickAnimationTimerId = undefined;
  }
}

function playIdleClick($: import('voidstrap').Engine, event: CursorPosition): void {
  if (settingsPageActive || !event.insideWindow || event.button !== 'left') return;
  const current = read($, scene);
  const currentPrefs = read($, preferences);
  if (current.pose !== 'idle' || !current.visible) return;

  const dx = event.x - (current.x + SPRITE_SIZE / 2);
  const dy = event.y - (current.y + SPRITE_SIZE / 2);
  const hitRadius = Math.max(SPRITE_SIZE / 2, currentPrefs.idleRange);
  if (dx * dx + dy * dy > hitRadius * hitRadius) return;

  cancelClickAnimationTimer($);
  update($, scene, state => ({ ...state, clicking: true }));
  clickAnimationTimerId = $.clock.after(CLICK_FEEDBACK_MS, () => {
    clickAnimationTimerId = undefined;
    update($, scene, state => ({ ...state, clicking: false }));
  });
}

function scheduleIdleKick($: import('voidstrap').Engine): void {
  cancelIdleKickTimer($);
  idleKickTimerId = $.clock.after(IDLE_KICK_DELAY_MS, () => {
    idleKickTimerId = undefined;
    if (settingsPageActive) return;
    const latestPointer = $.cursor.get();
    pointerInsideWindow = latestPointer.insideWindow;
    if (latestPointer.insideWindow) handlePointer($, latestPointer, 'idle');
  });
}

function handlePointer(
  $: import('voidstrap').Engine,
  event: CursorPosition,
  mode: 'initialize' | 'move' | 'idle'
): void {
  const current = read($, scene);
  const currentPrefs = read($, preferences);
  const now = $.clock.now();
  const elapsedMs = mode === 'initialize'
    ? 0
    : clamp(now - (lastMovementAt ?? now), 0, MAX_STEP_MS);
  lastMovementAt = now;
  const width = Math.max(SPRITE_SIZE, event.windowWidth);
  const height = Math.max(SPRITE_SIZE, event.windowHeight);
  const pointerX = clamp(event.x, 0, width);
  const pointerY = clamp(event.y, 0, height);

  const hasPreviousPosition = current.windowWidth > 0 && current.windowHeight > 0;
  let x = hasPreviousPosition
    ? clamp(current.x, 0, width - SPRITE_SIZE)
    : clamp(pointerX - SPRITE_SIZE - 12, 0, width - SPRITE_SIZE);
  let y = hasPreviousPosition
    ? clamp(current.y, 0, height - SPRITE_SIZE)
    : clamp(pointerY - SPRITE_SIZE / 2, 0, height - SPRITE_SIZE);
  const dx = pointerX - (x + SPRITE_SIZE / 2);
  const dy = pointerY - (y + SPRITE_SIZE / 2);
  const distance = Math.sqrt(dx * dx + dy * dy);

  let pose: Pose = 'idle';
  let frame = 0;
  if (mode !== 'initialize' && distance > currentPrefs.idleRange) {
    const step = Math.min(currentPrefs.speed * SPEED_BOOST * elapsedMs / 1000, distance - currentPrefs.idleRange);
    if (step > 0.5) {
      x += dx / distance * step;
      y += dy / distance * step;
      pose = directionFor(dx, dy);
      const frameCount = getPixelFrameCount(currentPrefs.skin, pose);
      if (current.pose !== pose || frameCount < 2) {
        frame = 0;
        lastAnimationFrameAt = $.clock.now();
      } else {
        const animationNow = $.clock.now();
        const animationIntervalMs = 1000 / currentPrefs.animationFps;
        if (lastAnimationFrameAt === undefined || animationNow - lastAnimationFrameAt >= animationIntervalMs) {
          frame = (current.frame + 1) % frameCount;
          lastAnimationFrameAt = animationNow;
        } else {
          frame = current.frame;
        }
      }
    } else {
      lastAnimationFrameAt = undefined;
    }
  } else {
    lastAnimationFrameAt = undefined;
  }

  if (pose !== 'idle') cancelClickAnimationTimer($);
  const nextX = clamp(x, 0, width - SPRITE_SIZE);
  const nextY = clamp(y, 0, height - SPRITE_SIZE);
  const nextClicking = pose === 'idle' ? current.clicking : false;
  if (
    nextX === current.x && nextY === current.y && pose === current.pose && frame === current.frame
    && nextClicking === current.clicking && event.insideWindow === current.visible
    && width === current.windowWidth && height === current.windowHeight
  )
    return;
  update($, scene, () => ({
    x: nextX,
    y: nextY,
    pointerX,
    pointerY,
    windowWidth: width,
    windowHeight: height,
    visible: event.insideWindow,
    pose,
    frame,
    clicking: nextClicking
  }));
}

function savePreferences($: import('voidstrap').Engine, next: Preferences): void {
  update($, preferences, () => next);
  $.store.set(PREFS_KEY, next);
}

function loadPreferences($: import('voidstrap').Engine): void {
  const currentPrefs = $.store.get(PREFS_KEY);
  const legacyPrefs = $.store.get(LEGACY_PREFS_KEY);
  const stored = currentPrefs ?? legacyPrefs;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return;
  const saved = stored as { speed?: unknown; animationFps?: unknown; idleRange?: unknown; skin?: unknown };
  const isLegacy = currentPrefs === undefined;
  const savedSpeed = typeof saved.speed === 'number' ? saved.speed : 12;
  const speed = isLegacy
    ? clamp(Math.round(savedSpeed * 5), 20, 240)
    : clamp(Math.round(savedSpeed), 20, 240);
  const animationFps = typeof saved.animationFps === 'number'
    ? clamp(Math.round(saved.animationFps), 2, 12)
    : 6;
  const idleRange = typeof saved.idleRange === 'number'
    ? clamp(Math.round(saved.idleRange), 0, 160)
    : DEFAULT_IDLE_RANGE;
  const skin = typeof saved.skin === 'string' && SKIN_IDS.includes(saved.skin as SkinId)
    ? saved.skin as SkinId
    : 'default';
  update($, preferences, () => ({ speed, animationFps, idleRange, skin }));
}

function applySkin($: import('voidstrap').Engine, rawSkinName: string): void {
  const skinName = rawSkinName.trim().toLowerCase();
  if (!SKIN_IDS.includes(skinName as SkinId)) {
    $.ui.toast('Oneko', 'Choose one of the skins in the list.');
    return;
  }

  const current = read($, preferences);
  const next: Preferences = { ...current, skin: skinName as SkinId };
  savePreferences($, next);
}

export const register: Register = (on) => {
  on('session.start', ($, e, next) => {
    loadPreferences($);
    settingsPageActive = isOnekoSettingsPage($.nav.current());
    const overlay = $.ui.attach({ id: OVERLAY, anchor: 'WindowRoot', placement: 'end' });
    if (!overlay.isPlaced) $.log('Oneko overlay attach failed: ' + overlay.reason);
    $.modpages.add({ id: SETTINGS_PAGE, title: 'Oneko', icon: 'Settings24' });
    const pointer = $.cursor.get();
    pointerInsideWindow = pointer.insideWindow;
    if (pointer.insideWindow && !settingsPageActive) handlePointer($, pointer, 'initialize');
    cancelIdleKickTimer($);
    cancelClickAnimationTimer($);
    cancelFollowTimer($);
    followTimerId = $.clock.every(FOLLOW_INTERVAL_MS, () => {
      if (settingsPageActive) return;
      const latestPointer = $.cursor.get();
      pointerInsideWindow = latestPointer.insideWindow;
      if (latestPointer.insideWindow) handlePointer($, latestPointer, 'idle');
    });
    return next(e);
  });

  on('session.end', ($, e, next) => {
    cancelIdleKickTimer($);
    cancelClickAnimationTimer($);
    cancelFollowTimer($);
    settingsPageActive = false;
    pointerInsideWindow = false;
    $.ui.detach(OVERLAY);
    $.modpages.remove(SETTINGS_PAGE);
    return next(e);
  });

  on('page.navigate', ($, e, next) => {
    settingsPageActive = isOnekoSettingsPage(e.page);
    if (settingsPageActive) {
      cancelIdleKickTimer($);
      cancelClickAnimationTimer($);
      update($, scene, state => ({ ...state, clicking: false }));
    }
    return next(e);
  });

  on('cursor.enter', ($, e, next) => {
    pointerInsideWindow = e.insideWindow;
    if (!settingsPageActive) {
      const current = read($, scene);
      const mode = current.windowWidth > 0 && current.windowHeight > 0 ? 'move' : 'initialize';
      handlePointer($, e, mode);
    }
    return next(e);
  });
  on('cursor.move', ($, e, next) => {
    pointerInsideWindow = e.insideWindow;
    return next(e);
  });
  on('cursor.down', ($, e, next) => {
    pointerInsideWindow = e.insideWindow;
    playIdleClick($, e);
    return next(e);
  });
  on('cursor.up', ($, e, next) => {
    pointerInsideWindow = e.insideWindow;
    if (!settingsPageActive) {
    }
    return next(e);
  });
  on('cursor.leave', ($, e, next) => {
    cancelIdleKickTimer($);
    pointerInsideWindow = false;
    lastMovementAt = undefined;
    lastAnimationFrameAt = undefined;
    if (!settingsPageActive) {
      update($, scene, state => ({ ...state, visible: false }));
    }
    return next(e);
  });

  on('ui.render', { component: 'Widget', requestId: OVERLAY }, ($) => {
    const { Canvas, Box } = $.ui.resolve();
    const state = read($, scene);
    const currentPrefs = read($, preferences);
    const visible = state.visible && pointerInsideWindow && !settingsPageActive;
    // A nearby left click briefly shows the tail-up pose while Oneko is idle.
    const renderPose: Pose = state.clicking && state.pose === 'idle' ? 'alert' : state.pose;
    const rects = getPixelRectsFromSvg($, currentPrefs.skin, renderPose, state.frame);

    return (
      <Canvas hitTestVisible={false}>
        {rects.map((rect, index) => (
          <Box key={'oneko-svg-pixel-' + index} visible={visible}
            left={state.x + rect.x} top={state.y + rect.y}
            width={rect.width} height={rect.height}
            background={rect.background} hitTestVisible={false} />
        ))}
      </Canvas>
    );
  });

  on('ui.render', { component: 'Page', requestId: SETTINGS_PAGE }, ($) => {
    const { Box, Text, Button, Badge, Canvas, Wrap } = $.ui.resolve();
    const current = read($, preferences);
    const selectedLabel = SKIN_LABELS[current.skin];
    const previewRects = getPixelRectsFromSvg($, current.skin, 'idle', 0);
    return (
      <Box direction="column" gap={20} padding={24} horizontalAlignment="stretch">
        <Box direction="column" gap={5}>
          <Text text="Oneko" size={26} bold={true} />
          <Text text="Choose a look for your cursor companion. Your skin changes apply immediately."
            size={14} dim={true} wrap={true} />
        </Box>
        <Box direction="row" gap={16} padding={20} align="center" horizontalAlignment="stretch"
          background="#FF352F1B" borderBrush="#FF887621" borderThickness={1} cornerRadius={10}>
          <Canvas key="oneko-vector-preview" width={80} height={80} margin={8}
            background="#FF272416" borderBrush="#FF756315" borderThickness={1}
            cornerRadius={8} hitTestVisible={false}>
            {previewRects.map((rect, index) => (
              <Box key={'oneko-preview-vector-' + index}
                left={8 + rect.x * 2} top={8 + rect.y * 2}
                width={rect.width * 2} height={rect.height * 2}
                background={rect.background} hitTestVisible={false} />
            ))}
          </Canvas>
          <Box direction="column" gap={5} margin={8} horizontalAlignment="left">
            <Text text="CURRENT SKIN" size={11} bold={true} dim={true} />
            <Text text={selectedLabel} size={22} bold={true} />
            <Text text="Changes apply instantly." size={13} dim={true} wrap={true} />
          </Box>
        </Box>
        <Box direction="column" gap={14} padding={20} horizontalAlignment="stretch"
          background="#FF403811" borderBrush="#FF887621" borderThickness={1} cornerRadius={10}>
          <Box direction="row" gap={10} margin={12} horizontalAlignment="left" align="center">
            <Text text="Available skins" size={18} bold={true} />
            <Badge key="oneko-skin-count" text={SKIN_IDS.length + " skins"} variant="neutral" />
          </Box>
          <Text text="Click a button to switch skins. Your current choice is highlighted."
            size={13} margin={12} dim={true} wrap={true} />
          <Wrap itemWidth={166} itemHeight={58} horizontalAlignment="left">
            {SKIN_IDS.map(skinId => {
              const selected = current.skin === skinId;
              const label = SKIN_LABELS[skinId];
              return (
                <Button key={"oneko-skin-" + skinId} margin={7}
                  hitTestVisible={true} width={152} height={44}
                  label={selected ? "✓  " + label : label}
                  variant={selected ? "primary" : "secondary"}
                  background={selected ? "#FFFFD629" : "#FF655513"}
                  foreground={selected ? "#FF211A04" : "#FFFFF5D8"}
                  borderBrush={selected ? "#FFFFD629" : "#FF8C771A"}
                  borderThickness={1} cornerRadius={8}
                  onPress={() => applySkin($, skinId)} />
              );
            })}
          </Wrap>
        </Box>
      </Box>
    );
  });
};
