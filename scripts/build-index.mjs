import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, MODS, EMPTY_MODERATION, listMods, walk, readJson, sha256, fingerprint } from './lib.mjs';

const commit = process.env.GITHUB_SHA ?? process.argv[2];
if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
  console.error('pass the main commit sha');
  process.exit(1);
}
const out = process.argv[3] ?? 'index.json';
const moderationPath = process.argv[4];
const moderation = moderationPath && fs.existsSync(moderationPath) ? { ...EMPTY_MODERATION, ...readJson(moderationPath) } : EMPTY_MODERATION;
const maintainerId = Number(process.env.MAINTAINER_ID ?? 195697851);
const trusted = new Set([maintainerId, ...moderation.trusted.map(t => t.id)]);
const banned = new Set(moderation.banned.map(b => b.id));

const mods = [];
const blocked = [];
for (const name of listMods()) {
  const dir = path.join(MODS, name);
  const owner = readJson(path.join(dir, 'owner.json'));
  const manifest = readJson(path.join(dir, '.voidstrap-mod', 'plugin.json'));
  const id = `${owner.id}/${name}`;
  if (moderation.takedowns[id] || banned.has(owner.id)) {
    blocked.push({ id, reason: moderation.takedowns[id]?.reason ?? 'the author is banned from the library' });
    continue;
  }
  const files = walk(dir).filter(f => !f.symlink).map(f => ({ path: f.rel, size: f.size, sha256: sha256(f.full) })).sort((a, b) => a.path.localeCompare(b.path));
  const print = fingerprint(files);
  const verified = moderation.verified[id]?.fingerprint === print;
  const dates = execFileSync('git', ['log', '--format=%cI', '--', `mods/${name}`], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  mods.push({
    id,
    name,
    ownerId: owner.id,
    login: owner.login,
    version: manifest.version,
    description: manifest.description,
    tags: Array.isArray(manifest.tags) ? manifest.tags : [],
    network: Array.isArray(manifest.network) ? manifest.network : [],
    permissions: Array.isArray(manifest.permissions) ? manifest.permissions.filter(p => ['roblox-account', 'native', 'files', 'web'].includes(p)) : [],
    icon: files.some(f => f.path === 'icon.ico') ? 'icon.ico' : null,
    created: dates.at(-1) ?? null,
    updated: dates[0] ?? null,
    verified,
    trusted: trusted.has(owner.id),
    featured: Number(moderation.featured[id] ?? 0),
    fingerprint: print,
    files
  });
}
for (const id of Object.keys(moderation.takedowns)) if (!blocked.some(b => b.id === id)) blocked.push({ id, reason: moderation.takedowns[id].reason ?? '' });
const index = { schema: 2, repository: process.env.GITHUB_REPOSITORY ?? 'KloBraticc/voidstrap-mods-library', commit, generated: new Date().toISOString(), mods, blocked };
fs.writeFileSync(out, JSON.stringify(index, null, 2) + '\n');
console.log(`Wrote ${mods.length} mod(s) and ${blocked.length} takedown(s) to ${out} for ${commit}`);
