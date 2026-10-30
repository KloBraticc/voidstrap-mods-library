import fs from 'node:fs';
import { compact, sendWebhook } from './discord.mjs';

const pr = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request;

try {
  const sent = await sendWebhook(process.env.DISCORD_WEBHOOK_URL, {
    author: { name: compact(pr.user.login, 80) },
    title: `Pull request opened: ${compact(pr.title, 200)}`.slice(0, 256),
    description: compact(pr.body ?? '', 500),
    url: pr.html_url,
    color: 0x5865f2,
    fields: [
      { name: 'Number', value: `#${pr.number}`, inline: true },
      { name: 'Files changed', value: String(pr.changed_files ?? 0), inline: true },
      { name: 'Draft', value: pr.draft ? 'Yes' : 'No', inline: true },
    ],
  });
  console.log(sent ? 'Sent the Discord notification.' : 'No valid Discord webhook is set.');
} catch (e) {
  console.log(`The Discord notification failed: ${String(e?.message ?? e).slice(0, 200).replace(/https:\/\/discord\S+/g, '[webhook]')}`);
}
