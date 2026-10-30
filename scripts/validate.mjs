import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { ROOT, MODS, RULES, ALLOWED_HOSTS, NAME_PATTERN, SEMVER, HOST_PATTERN, TAGS, listMods, walk, readJson } from './lib.mjs';

const errors = [];
const reviews = [];
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const skipTypes = process.argv.includes('--no-types');
const blocked = RULES.blocked.map(rule => ({ ...rule, regex: new RegExp(rule.pattern, rule.caseSensitive ? '' : 'i') }));
const L = RULES.limits;
const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);

function fail(mod, text) { errors.push(`${mod}: ${text}`); }
function review(mod, text) { reviews.push(`${mod}: ${text}`); }

function checkIcon(mod, file) {
  if (file.rel !== 'icon.ico') { fail(mod, `${file.rel} must be named icon.ico at the root of the mod`); return; }
  const bytes = fs.readFileSync(file.full);
  if (file.size > L.maxIconBytes) fail(mod, `${file.rel} is larger than ${L.maxIconBytes} bytes`);
  if (bytes.length < 22 || bytes[0] !== 0 || bytes[1] !== 0 || bytes[2] !== 1 || bytes[3] !== 0) { fail(mod, `${file.rel} is not a valid .ico icon`); return; }
  const count = bytes.readUInt16LE(4);
  if (count < 1 || count > 16 || bytes.length < 6 + count * 16) { fail(mod, `${file.rel} has an invalid icon directory`); return; }
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    const size = bytes.readUInt32LE(entry + 8);
    const offset = bytes.readUInt32LE(entry + 12);
    if (size < 40 || offset < 6 + count * 16 || offset + size > bytes.length) { fail(mod, `${file.rel} has an out-of-bounds icon frame`); return; }
    const isPng = bytes[offset] === 0x89 && bytes[offset + 1] === 0x50 && bytes[offset + 2] === 0x4E && bytes[offset + 3] === 0x47 && bytes[offset + 4] === 0x0D && bytes[offset + 5] === 0x0A && bytes[offset + 6] === 0x1A && bytes[offset + 7] === 0x0A;
    const isBmp = bytes.readUInt32LE(offset) === 40;
    if (!isPng && !isBmp) { fail(mod, `${file.rel} frame ${i + 1} is neither a PNG nor a BMP icon frame`); return; }
  }
  const ascii = bytes.toString('latin1');
  for (const rule of blocked) {
    if (rule.binary === false) continue;
    if (rule.level !== 'review' && rule.regex.test(ascii)) { fail(mod, `${file.rel} metadata violates rule: ${rule.reason}`); return; }
  }
}

function checkText(mod, file, isCode) {
  const text = fs.readFileSync(file.full, 'utf8');
  if (text.includes('\u0000')) fail(mod, `${file.rel} contains binary data. Text files must hold plain readable text only, so re-save the file as text or remove it`);
  if (/[​-‏‪-‮⁦-⁩﻿]/.test(text)) fail(mod, `${file.rel} contains invisible or direction changing characters`);
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const where = `${file.rel}:${i + 1}`;
    if (isCode && line.length > L.maxLineLength) fail(mod, `${where} is longer than ${L.maxLineLength} characters. Lines this long usually mean minified or packed code, which is not accepted. Write normal readable code with short lines instead`);
    if (new RegExp(`[A-Za-z0-9+/=]{${L.maxEncodedRun},}`).test(line)) fail(mod, `${where} holds a long encoded blob. A very long run of letters and digits looks like hidden data. Keep data short and readable`);
    if (new RegExp(`(0x)?[0-9a-fA-F]{${L.maxEncodedRun},}`).test(line)) fail(mod, `${where} holds a long hex blob. A very long run of hex digits looks like hidden data. Keep data short and readable`);
    for (const rule of blocked) {
      if (rule.codeOnly && !isCode) continue;
      if (!rule.regex.test(line)) continue;
      if (rule.level === 'review') review(mod, `${where} ${rule.reason}`);
      else fail(mod, `${where} ${rule.reason}`);
    }
  });
}

function checkMod(mod) {
  const dir = path.join(MODS, mod);
  if (!NAME_PATTERN.test(mod)) return fail(mod, 'the folder name must be lowercase letters, digits and hyphens');
  for (const rule of blocked) {
    if (rule.level !== 'review' && rule.regex.test(mod.replace(/-/g, ' '))) fail(mod, `mod name violates rule: ${rule.reason}`);
  }
  const files = walk(dir);
  if (files.length > L.maxFiles) fail(mod, `has ${files.length} files, the limit is ${L.maxFiles}`);
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > L.maxModBytes) fail(mod, `is ${total} bytes, the limit is ${L.maxModBytes}`);
  for (const file of files) {
    if (file.symlink) { fail(mod, `${file.rel} is a symbolic link`); continue; }
    const parts = file.rel.split('/');
    if (parts.length > L.maxPathDepth) fail(mod, `${file.rel} is nested too deeply`);
    if (parts.some(p => !/^[A-Za-z0-9._-]+$/.test(p) || p === '..')) fail(mod, `${file.rel} has an unsafe file name`);
    if (parts.some((p, i) => p.startsWith('.') && !(i === 0 && p === '.voidstrap-mod'))) fail(mod, `${file.rel} is a hidden file`);
    for (const rule of blocked) {
      if (rule.level !== 'review' && rule.regex.test(file.rel.replace(/[/_.-]/g, ' '))) fail(mod, `${file.rel} file name violates rule: ${rule.reason}`);
    }
    if (file.rel.startsWith('.voidstrap-mod/') && file.rel !== '.voidstrap-mod/plugin.json') fail(mod, `${file.rel} must not be published, only plugin.json belongs in .voidstrap-mod`);
    if (file.rel.startsWith('node_modules/')) fail(mod, 'node_modules must not be published');
    const ext = path.extname(file.rel).toLowerCase();
    if (!RULES.allowedExtensions.includes(ext)) { fail(mod, `${file.rel} has a file type that is not allowed`); continue; }
    if (ext === '.ico') { checkIcon(mod, file); continue; }
    if (mediaExtensions.has(ext)) {
      if (file.size > L.maxMediaBytes) fail(mod, `${file.rel} exceeds the media size limit`);
      continue;
    }
    if (file.size > L.maxFileBytes) fail(mod, `${file.rel} is larger than ${L.maxFileBytes} bytes`);
    checkText(mod, file, RULES.codeExtensions.includes(ext));
  }

  let owner;
  try { owner = readJson(path.join(dir, 'owner.json')); } catch { return fail(mod, 'owner.json is missing or not valid JSON'); }
  if (!Number.isSafeInteger(owner.id) || owner.id <= 0) fail(mod, 'owner.json id must be the numeric GitHub user id');
  if (typeof owner.login !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(owner.login)) fail(mod, 'owner.json login must be a GitHub login');
  if (Object.keys(owner).some(k => !['id', 'login'].includes(k))) fail(mod, 'owner.json may only hold id and login');

  let manifest;
  try { manifest = readJson(path.join(dir, '.voidstrap-mod', 'plugin.json')); } catch { return fail(mod, '.voidstrap-mod/plugin.json is missing or not valid JSON'); }
  if (manifest.name !== mod) fail(mod, 'plugin.json name must match the folder name');
  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) fail(mod, 'plugin.json version must look like 1.2.3');
  if (typeof manifest.description !== 'string' || manifest.description.trim().length === 0 || manifest.description.length > L.maxDescription) fail(mod, `plugin.json description must be 1 to ${L.maxDescription} characters`);
  const hosts = manifest.network ?? [];
  if (!Array.isArray(hosts)) fail(mod, 'plugin.json network must be a list of host names');
  else for (const host of hosts) {
    if (typeof host !== 'string' || !HOST_PATTERN.test(host)) fail(mod, `network host ${JSON.stringify(host)} is not a plain host name`);
    else if (!ALLOWED_HOSTS.includes(host)) review(mod, `asks for network access to ${host}, which is not on allowed-hosts.json`);
  }
  if (manifest.tags !== undefined) {
    if (!Array.isArray(manifest.tags) || manifest.tags.length > 5) fail(mod, 'plugin.json tags must be a list of up to 5 tags');
    else for (const tag of manifest.tags) if (!TAGS.includes(tag)) fail(mod, `tag ${JSON.stringify(tag)} is not in tags.json`);
  }
  if (manifest.permissions !== undefined) {
    if (!Array.isArray(manifest.permissions) || manifest.permissions.some(p => p !== 'roblox-account')) fail(mod, 'plugin.json permissions may only contain "roblox-account"');
    else if (manifest.permissions.length) review(mod, 'asks to use the Roblox account through $.roblox.request, the maintainer must review it');
  }
  if (manifest.library !== undefined) {
    const lib = manifest.library;
    if (typeof lib !== 'object' || lib.ownerId !== owner.id || lib.id !== `${owner.id}/${mod}`) fail(mod, 'plugin.json library must be { id: "<ownerId>/<name>", ownerId } and match owner.json');
  }

  let hooks;
  try { hooks = readJson(path.join(dir, 'hooks', 'hooks.json')); } catch { return fail(mod, 'hooks/hooks.json is missing or not valid JSON'); }
  const modules = hooks.modules;
  if (!Array.isArray(modules) || modules.length !== 1 || typeof modules[0] !== 'string') return fail(mod, 'hooks.json must name exactly one module');
  const entry = path.resolve(dir, 'hooks', modules[0]);
  if (!entry.startsWith(path.join(dir, 'hooks') + path.sep) || !fs.existsSync(entry)) fail(mod, 'the hooks module must exist inside hooks/');
  if (!skipTypes) typeCheck(mod, dir, files);
}

function typeCheck(mod, dir, files) {
  const sources = files.filter(f => /\.(ts|tsx)$/.test(f.rel)).map(f => f.full);
  if (sources.length === 0) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vsmod-'));
  const config = {
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react', jsxFactory: 'h', jsxFragmentFactory: 'Fragment', strict: true, noEmit: true, lib: ['ES2022'], types: [], skipLibCheck: false },
    files: [path.join(ROOT, 'types', 'voidstrap.d.ts'), ...sources]
  };
  const configPath = path.join(tmp, 'tsconfig.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', configPath], { stdio: 'pipe', encoding: 'utf8' });
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(0, 20).map(l => l.replace(dir + path.sep, '').replace(dir, '')).join('\n  ');
    fail(mod, `TypeScript errors:\n  ${out}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const mods = only.length ? only : listMods();
for (const mod of mods) {
  if (!fs.existsSync(path.join(MODS, mod))) continue;
  checkMod(mod);
}

if (errors.length === 0) {
  try {
    execFileSync(process.env.VOIDSTRAP_MEDIA_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [path.join(ROOT, 'scripts', 'media-check.py'), ...mods], { cwd: ROOT, stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8', timeout: 300000 });
  } catch (err) {
    const stderr = (err.stderr ?? '').toString();
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
    const match = stderr.match(/Media rejected: ([^\r\n]+)/);
    if (match) {
      fail('media', `sexual content detected in ${match[1]}. If this is a safe icon or image and was flagged as a false positive, try adjusting the image colors or contrast, or ask the maintainer to review it.`);
    } else {
      fail('media', 'local media checking failed or is unavailable; install scripts/media-requirements.txt and retry');
    }
  }
}

const summary = [];
summary.push(`Checked ${mods.length} mod(s).`);
if (reviews.length) summary.push('', 'Needs a manual look:', ...reviews.map(r => `  ${r}`));
if (errors.length) summary.push('', 'Problems:', ...errors.map(e => `  ${e}`));
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + summary.join('\n') + '\n```\n');
process.exit(errors.length ? 1 : 0);
