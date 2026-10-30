import type { Engine } from 'voidstrap';
import { SKIN_DATA_1 } from './skin-svg-data-1';
import { SKIN_DATA_2 } from './skin-svg-data-2';
import { SKIN_DATA_3 } from './skin-svg-data-3';
import { SKIN_DATA_4 } from './skin-svg-data-4';
import { SKIN_DATA_5 } from './skin-svg-data-5';
import { SKIN_DATA_6 } from './skin-svg-data-6';

type PixelRect = { x: number; y: number; width: number; height: number; background: string };
type Pose = 'idle' | 'alert' | 'sleeping' | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const POSE_ORDER: Pose[] = ["idle","alert","sleeping","N","NE","E","SE","S","SW","W","NW"];
const FRAME_COUNTS: Record<Pose, number> = {
  idle: 1, alert: 1, sleeping: 2,
  N: 2, NE: 2, E: 2, SE: 2, S: 2, SW: 2, W: 2, NW: 2
};
const SKIN_IDS = ["ace","black","bunny","calico","default","eevee","esmeralda","fox","ghost","gray","jess","kina","lucy","maia","maria","mike","silver","silversky","snuupy","spirit","tora","valentine"];
const SVG_SOURCES: Record<string, string> = {
  ...SKIN_DATA_1,
  ...SKIN_DATA_2,
  ...SKIN_DATA_3,
  ...SKIN_DATA_4,
  ...SKIN_DATA_5,
  ...SKIN_DATA_6,
};
const FRAME_COUNT = 20;
const FRAME_COLUMNS = 4;
const FRAME_SIZE = 32;
const atlasCache: Record<string, PixelRect[][]> = {};

export function getPixelFrameCount(skin: string, pose: string): number {
  return SKIN_IDS.includes(skin) ? (FRAME_COUNTS[pose as Pose] ?? 0) : 0;
}

export function getSpriteFrameIndex(skin: string, pose: string, frameIndex: number): number {
  if (!SKIN_IDS.includes(skin) || getPixelFrameCount(skin, pose) === 0) return 0;
  let offset = 0;
  for (const currentPose of POSE_ORDER) {
    const count = FRAME_COUNTS[currentPose];
    if (currentPose === pose) {
      const safeIndex = ((Math.floor(frameIndex) % count) + count) % count;
      return offset + safeIndex;
    }
    offset += count;
  }
  return 0;
}

function loadAtlas(skin: string): PixelRect[][] {
  const cached = atlasCache[skin];
  if (cached) return cached;
  const frames: PixelRect[][] = Array.from({ length: FRAME_COUNT }, () => []);
  const svg = SVG_SOURCES[skin];
  const pathPattern = /<path\b([^>]*)\/>/g;
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = pathPattern.exec(svg ?? "")) !== null) {
    const attrs = pathMatch[1];
    const fill = attrs.match(/\bfill="#([0-9a-fA-F]{6})"/)?.[1];
    const data = attrs.match(/\bd="([^"]*)"/)?.[1];
    if (!fill || !data) continue;
    const rectPattern = /([Mm])(-?\d+),(-?\d+)h(\d+)v(\d+)h-(\d+)z/g;
    let rectMatch: RegExpExecArray | null;
    let lastX = 0;
    let lastY = 0;
    while ((rectMatch = rectPattern.exec(data)) !== null) {
      const x = rectMatch[1] === "M" ? Number(rectMatch[2]) : lastX + Number(rectMatch[2]);
      const y = rectMatch[1] === "M" ? Number(rectMatch[3]) : lastY + Number(rectMatch[3]);
      const width = Number(rectMatch[4]);
      const height = Number(rectMatch[5]);
      lastX = x;
      lastY = y;
      const column = Math.floor(x / FRAME_SIZE);
      const row = Math.floor(y / FRAME_SIZE);
      const frameIndex = row * FRAME_COLUMNS + column;
      if (frameIndex < 0 || frameIndex >= FRAME_COUNT) continue;
      frames[frameIndex].push({
        x: x % FRAME_SIZE,
        y: y % FRAME_SIZE,
        width,
        height,
        background: "#FF" + fill.toUpperCase()
      });
    }
  }
  atlasCache[skin] = frames;
  return frames;
}

export function getPixelRectsFromSvg(_$: Engine, skin: string, pose: string, frameIndex: number): PixelRect[] {
  const safeSkin = SKIN_IDS.includes(skin) ? skin : "default";
  const frame = getSpriteFrameIndex(safeSkin, pose, frameIndex);
  return loadAtlas(safeSkin)[frame] ?? [];
}
