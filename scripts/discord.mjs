const WEBHOOK = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/;
const BAR_CELLS = 10;

export function compact(value, limit = 300) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/https?:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+/gi, '[webhook redacted]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[credential redacted]')
    .replace(/(?<![A-Za-z0-9])[A-Za-z0-9_+/=-]{32,}(?![A-Za-z0-9])/g, '[long token redacted]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email redacted]')
    .replace(/([\\*_~|>[\]()!])/g, '\\$1')
    .replace(/`/g, 'ˋ')
    .replace(/@/g, '@');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

export function safetyBar(percent) {
  if (!Number.isInteger(percent)) return '⬜'.repeat(BAR_CELLS) + '  **Not rated yet**';
  const green = Math.round(percent / BAR_CELLS);
  return '🟩'.repeat(green) + '🟥'.repeat(BAR_CELLS - green) + `  **${percent}%**`;
}

export function buildEmbed({ kind, mod, oldVersion, version, author, url, description, percent, verdict, summary, risks, hosts, permissions, files, ready }) {
  const list = items => (items.length ? items.map(item => compact(item, 80)).join(', ') : 'None');
  const changed = files.slice(0, 12).map(file => `\`${compact(file.filename.replace(`mods/${mod}/`, ''), 70)}\` ${file.status}, +${file.additions} -${file.deletions}`);
  if (files.length > 12) changed.push(`And ${files.length - 12} more`);
  const color = !Number.isInteger(percent) ? 0x5865f2 : percent >= 80 ? 0x2ecc71 : percent >= 50 ? 0xf1c40f : 0xed4245;
  const fields = [
    { name: 'AI safety for daily use', value: safetyBar(percent), inline: false },
    { name: 'AI verdict', value: compact(verdict, 40) || 'Not reviewed', inline: true },
    { name: 'Version', value: compact(oldVersion ? `${oldVersion} to ${version}` : version, 60) || 'Unknown', inline: true },
    { name: 'Merge', value: ready ? 'Merging automatically' : 'Waiting', inline: true },
    { name: 'Permissions', value: list(permissions), inline: true },
    { name: 'Websites', value: list(hosts), inline: true },
  ];
  if (summary) fields.push({ name: 'AI summary', value: compact(summary, 900), inline: false });
  if (risks.length) fields.push({ name: 'AI worries', value: risks.slice(0, 6).map(risk => `• ${compact(risk, 150)}`).join('\n'), inline: false });
  if (changed.length) fields.push({ name: 'Files changed', value: changed.join('\n').slice(0, 1000), inline: false });
  return {
    author: { name: compact(author, 80) },
    title: `${kind}: ${compact(mod, 100)}`.slice(0, 256),
    description: compact(description, 500),
    url,
    color,
    fields,
  };
}

export async function sendWebhook(webhookUrl, embed) {
  if (!WEBHOOK.test(webhookUrl ?? '')) return false;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json', 'user-agent': 'DiscordBot (https://github.com/KloBraticc/voidstrap-mods-library, 1.0)' },
      body: JSON.stringify({
        username: 'GitHub',
        avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        embeds: [embed],
        allowed_mentions: { parse: [], users: [], roles: [], replied_user: false },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (response.ok) return true;
    if (response.status !== 429 || attempt === 3) throw new Error(`Discord webhook returned HTTP ${response.status}`);
    const retry = Number(response.headers.get('retry-after'));
    await new Promise(resolve => setTimeout(resolve, Math.min(Math.max(Number.isFinite(retry) ? retry : 2, 1), 10) * 1000));
  }
  return false;
}
