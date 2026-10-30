# Voidstrap Mods Library

The community library of **Voidstrap mods**: small, sandboxed TypeScript mods that add pages, panes, themes and tools to [Voidstrap](https://github.com/KloBraticc/Voidstrap).

Every mod here is:

- **checked automatically** for malware patterns, cheats, hidden code and unsafe files
- **owned** by the GitHub account that first published it, so nobody else can change it
- **reviewed** by an automated pipeline (rule based checks plus an AI security review), with the maintainer reviewing anything it is not sure about
- **verified by hand** when the maintainer has personally confirmed it is safe, shown with a Verified badge
- **verified on install**: Voidstrap checks every downloaded file against a SHA 256 hash before writing it

---

## Contents

- [Installing mods](#installing-mods)
- [Publishing a mod](#publishing-a-mod)
  - [From Voidstrap (recommended)](#from-voidstrap-recommended)
  - [With an AI tool](#with-an-ai-tool)
  - [By hand on GitHub](#by-hand-on-github)
- [Updating your mod](#updating-your-mod)
- [Verified, trusted and unverified mods](#verified-trusted-and-unverified-mods)
- [Rules](#rules)
- [How a mod is laid out](#how-a-mod-is-laid-out)
- [Security model](#security-model)
- [What the checks look for](#what-the-checks-look-for)
- [Review process](#review-process)
- [Tags and search](#tags-and-search)
- [Reporting a bad mod](#reporting-a-bad-mod)
- [FAQ](#faq)
- [For the maintainer](#for-the-maintainer)

---

## Installing mods

1. Open Voidstrap, then **Voidstrap mods**, then the **Library** tab.
2. Search, filter by tag, or scroll, then press **Install**.
3. What happens next depends on the mod's badge (see [below](#verified-trusted-and-unverified-mods)):
   - **Verified** or **Trusted author**: installs right away and turns on.
   - **Not verified**: Voidstrap shows a warning with the author and the websites the mod contacts. **Do not install it unless you trust the author.** If you continue, Voidstrap still asks **Turn on this mod?** before it runs.

When the author publishes a new version, the button changes to **Update**. If the maintainer takes a mod down, Voidstrap tells you and turns it off.

Mods run inside Voidstrap's sandbox. They cannot read your files, your Roblox login, or anything outside the Voidstrap mod API, and they can only reach the websites listed in their manifest.

## Publishing a mod

### From Voidstrap (recommended)

1. Make your mod in **Voidstrap mods**, then **Create**.
2. Press **Publish** on its card.
3. The first time, press **Sign in with GitHub**. Voidstrap shows a short code. Open `github.com/login/device`, paste it and approve. Voidstrap only asks for the `public_repo` permission, which it needs to open a pull request for you.
4. Check the name, version and notes, then press **Publish**.

Voidstrap then does everything for you:

- runs the same checks as this repository, so most problems show up before anything is uploaded
- forks this repository to your account (once)
- uploads your mod to a new branch and writes `owner.json` with your GitHub account
- opens the pull request and shows you its link

You can follow the review on the pull request page.

### With an AI tool

Voidstrap has an MCP server, so AI coding tools can build and publish mods for you:

1. In Voidstrap press **Connect AI** on the Voidstrap mods page and follow the steps.
2. Ask the tool to make a Voidstrap mod, then to publish it.
3. The tool calls `manage_voidstrap_mods` with `action: "publish"`. **Voidstrap always asks you to confirm in the app**, so an AI can never publish on its own, and it publishes from **your** GitHub account.

See [AGENTS.md](AGENTS.md) for the exact rules AI tools must follow.

### By hand on GitHub

1. Fork this repository.
2. Add your mod as `mods/<your-mod-name>/` (see [layout](#how-a-mod-is-laid-out)).
3. Add `mods/<your-mod-name>/owner.json` with **your numeric GitHub user id** and login. Find your id at `https://api.github.com/users/<your-login>` (the `id` field).
4. Run the checks locally: `npm ci --ignore-scripts` then `npm run validate -- <your-mod-name>`.
5. Open a pull request that changes **only** your mod folder.

## Updating your mod

Change your mod in Voidstrap and press **Publish** again, or open a new pull request by hand. Updates must:

- come from the **same GitHub account** that first published the mod
- raise the `version` in `.voidstrap-mod/plugin.json` (for example `1.0.0` to `1.0.1`)
- keep `owner.json` unchanged

## Verified, trusted and unverified mods

| Badge | Meaning | Install |
| --- | --- | --- |
| **Verified** | The maintainer personally read this exact version and confirmed it is safe. | Instant, no warning |
| **Trusted author** | Made by an account the maintainer trusts (the maintainer is always trusted). | Instant, no warning |
| none | Passed the automated review, but nobody has personally confirmed it. | Warning first: do not install unless you trust the author |

- Verification is tied to the **exact files** of a version (a SHA 256 fingerprint of every file). When the author publishes an update, the badge disappears until the maintainer verifies the new version.
- Verified and featured mods are shown above other mods in Voidstrap.
- Only the maintainer can verify mods, trust authors, feature mods or take mods down. That list lives on the `moderation` branch, which only the maintainer's workflows write to.

## Using the Roblox account

Mods may read things from the user's Roblox account (friends, presence, inventory, groups and more) without ever touching the login cookie:

```json
"permissions": ["roblox-account"]
```

```ts
const r = await $.roblox.request('https://friends.roblox.com/v1/my/friends/count');
const me = await $.roblox.account();
```

How it stays safe:

- **The mod never sees the cookie.** Voidstrap attaches the login to the request itself, so there is nothing a mod could send anywhere, whatever its code does.
- **Roblox only.** Requests may only go over https to Roblox API hosts (users, friends, presence, thumbnails, games, groups, badges, catalog, avatar, inventory, economy, followings, develop). Redirects are never followed.
- **Read only.** Only GET, plus a few POST lookups (presence, thumbnails, user lookups). Buying, trading, messaging and settings are not possible.
- **Rate limited.** At most 60 requests a minute per mod.
- **The user approves it separately.** Voidstrap asks for Roblox account access on its own, also when an update adds the permission.
- **Always reviewed.** Mods with this permission are labelled `roblox-account` and never merged automatically.

### Run the checks again

Comment `retry` on your pull request to run failed checks and the review again with the latest rules. Only the author and the maintainer can do this.

### Extra power: native, files and web

`native`, `files` and `web` under `permissions` are for mods that need more than the normal API. They are labelled `powerful-mod` and pass two AI security reviews. A person reads the first version of each new Powerful mod once. Voidstrap shows a Powerful mod badge and a warning that unlocks after 3 seconds, and users approve the exact version again whenever it changes. `native` cannot be combined with `web` or `network` hosts, and none can be combined with `roblox-account`. Source may not contain login or password wording, `eval`, `Function`, `atob`, `fromCharCode` or escaped characters.
- Code that mentions `ROBLOSECURITY`, cookies or `document.cookie` is refused outright.

## Rules

A mod is **removed or refused** if it:

- cheats, exploits or gives an unfair advantage in Roblox games, or helps bypass Roblox anti cheat
- touches Roblox cookies, passwords, tokens or any login data
- hides what it does (obfuscation, packed or minified code, encoded payloads)
- sends data anywhere without saying so in its description and manifest
- mines cryptocurrency, shows ads, or tracks people
- copies another author's mod and publishes it as their own
- breaks the [Roblox Terms of Use](https://en.help.roblox.com/hc/en-us/articles/115004647846) or the [GitHub Terms](https://docs.github.com/site-policy/github-terms/github-terms-of-service)
- contains hateful, sexual or illegal content

Other requirements:

- One mod per pull request.
- Readable source only. Keep it small: at most 64 files and 20 MB, with text files limited to 256 KB and bundled media to 16 MB.
- Describe honestly what the mod does.

By publishing here you allow the mod to be redistributed through this library and Voidstrap. You keep the rights to your work.

## How a mod is laid out

```
mods/my-mod/
  owner.json                  { "id": 12345678, "login": "your-login" }
  .voidstrap-mod/plugin.json  name, version, description, network hosts
  hooks/hooks.json            { "modules": ["./register.tsx"] }
  hooks/register.tsx          your mod code
  pane.test.tsx               optional tests
  icon.ico                    optional icon, at most 256 KB
  README.md                   optional
```

`plugin.json`:

```json
{
  "name": "my-mod",
  "version": "1.0.0",
  "description": "What it does in one or two sentences.",
  "tags": ["tools"],
  "network": [],
  "userConfig": {}
}
```

- `name` must match the folder: lowercase letters, digits and hyphens.
- `tags` is optional: up to 5 tags from [`tags.json`](tags.json).
- `network` lists every host the mod fetches from. Leave it empty if it never goes online.
- Only these file types are accepted: `.ts .tsx .js .mjs .jsx .json .md .ico .png .jpg .jpeg .gif .webp .bmp`.
- Do not include `node_modules` or `.voidstrap-mod/types` (Voidstrap creates the types folder itself).

The full mod API lives in [`types/voidstrap.d.ts`](types/voidstrap.d.ts). In Voidstrap, the mod editor and the MCP `guide` action explain it in detail.

## Security model

Layers, from submission to your computer:

1. **Identity.** Every mod has an `owner.json` holding the author's **numeric GitHub user id**. Ids never change, even when someone renames their account, and a freed login cannot be reused to take over a mod. All ownership checks use the id, never the login.
2. **Ownership gate** (`.github/workflows/ownership.yml`). It runs on every pull request with `pull_request_target` but **never checks out or runs pull request code**. It only reads the changed file list and the existing `owner.json` through the GitHub API. It closes the pull request automatically when:
   - it changes a mod owned by another account
   - it changes more than one mod
   - it touches anything outside `mods/`
   - it tries to change a mod's owner
   - it does not raise the version of an existing mod
   - it comes from an organization or bot account
3. **Validation** (`.github/workflows/validate.yml`). It runs with a read only token and no secrets, and always uses the **maintainer's copy** of the checking scripts and dependency lock file, so a pull request cannot weaken the checks it is judged by. Install scripts are disabled. See [what the checks look for](#what-the-checks-look-for).
4. **Review.** `main` is protected:
   - every change needs an approved pull request: approved by the review bot when every requirement is met, otherwise by the maintainer
   - approvals are dismissed when new commits are pushed
   - both checks must pass
   - force pushes and branch deletion are blocked, also for admins
   - secret scanning and push protection are on
5. **Pinned, hashed index** (`.github/workflows/index.yml`). After a merge, CI checks every mod again, then publishes `index.json` to the `index` branch. It lists every file of every mod with its SHA 256 hash, pinned to the exact `main` commit it was built from.
6. **Verified install.** Voidstrap:
   - downloads files only from that pinned commit
   - checks each file's size and SHA 256 against the index and refuses the whole install on any mismatch
   - writes files only inside the mod's own folder
   - refuses an update when the mod's owner id changed
7. **Sandbox and consent.** Installed mods still need your **Turn on this mod?** approval. They run in Voidstrap's sandbox: no file system, no processes, no Roblox login data, and network access only to the hosts in their manifest.
8. **Publishing token.** The GitHub sign in token:
   - is limited to `public_repo`
   - is stored encrypted for your Windows account (or with owner only permissions on Linux)
   - is sent only to `github.com` and `api.github.com`
   - is never logged
   - **Sign out** deletes it

## What the checks look for

The rules live in [`scripts/rules.json`](scripts/rules.json) and [`scripts/validate.mjs`](scripts/validate.mjs).

| Check | Result |
| --- | --- |
| Folder name, `plugin.json` schema, semantic version, description length | fail |
| `owner.json` shape (numeric id and login only) | fail |
| More than 64 files, more than 20 MB in total, text over 256 KB, media over 16 MB, nested more than 4 levels | fail |
| File types other than `.ts .tsx .js .mjs .jsx .json .md .ico .png .jpg .jpeg .gif .webp .bmp`, symbolic links, hidden files, `node_modules` | fail |
| `.ico` without a valid icon header | fail |
| Local sexual content checks reject a bundled image, animation frame, icon frame or declared sprite cell | fail |
| Media cannot be decoded or checked, exceeds 48 MB decoded or has more than 180 frames or cells | fail |
| `eval`, `Function()`, computed dynamic `import()` | fail |
| `atob`, `btoa`, `unescape`, `decodeURIComponent`, `String.fromCharCode`, long escape sequences | fail |
| Base64 or hex blobs of 200 or more characters, lines longer than 400 characters | fail |
| Invisible or text direction characters | fail |
| Roblox cookies, Discord webhooks | fail |
| Roblox executor functions and names, cheat terms, process memory and injection functions | fail |
| `require`, `child_process`, `process.env`, `XMLHttpRequest`, `WebSocket` | fail |
| Crypto miners | fail |
| TypeScript errors against the Voidstrap mod API | fail |
| Words like password, token, api key, webhook | flagged for review |

Passing the automatic checks is only the first step, see [Review process](#review-process).

Bundled images, animated GIFs and sprite sheets are allowed after local checking. Install Python 3.11 or newer and run `python -m pip install -r scripts/media-requirements.txt` before `npm run validate`. The checker downloads a fixed model and license files once, verifies their checksums, then runs on the checking machine. Media is never sent to a hosted content service, including icons. Both validation and index publication require a successful media scan. Existing text and code review still applies.

Use `Image` for images or GIFs. Use `Sprite` with `frameWidth` and `frameHeight` in source pixels for a sprite sheet. Add a root `media.json` with `{"spriteSheets":{"assets/cat.png":{"frameWidth":32,"frameHeight":32}}}` so library checks examine each cell separately. Every animation frame is checked before acceptance. Large images are also checked in smaller regions. Inline encoded blobs and unmoderated external embeds remain restricted.

The visual classifier targets sexual imagery. It can miss unsafe content or reject safe content and does not classify every form of violence, hate or other harmful imagery. Reports, review and takedowns remain necessary.

## Review process

Pull requests are reviewed and merged **automatically** when every requirement is met. A bot comment on the pull request lists the requirements and keeps itself up to date:

| Requirement | Checked by |
| --- | --- |
| Automated safety checks pass (file types, size, banned code, cheats, TypeScript) | `validate.yml` |
| Your account owns the mod, one mod per pull request, version raised | `ownership.yml` |
| Author is not banned, account is a personal account | `review.yml` |
| The pull request says what changed (20 characters or more) | `review.yml` |
| Does not list hosts used to collect data | `validate.yml` |
| Nothing flagged for a manual look (credential words, text that tries to instruct a reviewer) | `review.yml` |
| AI security review says **safe** | `review.yml` |

When everything is ✅, the bot approves and squash merges the pull request and rebuilds the index. The mod appears in Voidstrap within a few minutes, **without** the Verified badge.

When anything is ❌, the pull request gets the `needs-review` label and waits for the maintainer. Fix the items and push again to re-run the review.

### What the AI review is, honestly

- It is a large language model called from the `review.yml` workflow through any OpenAI compatible chat completions API. The maintainer sets it up with a repository secret `AI_REVIEW_KEY`, and optionally the variables `AI_REVIEW_URL` (default `https://api.openai.com/v1/chat/completions`) and `AI_REVIEW_MODEL` (default `gpt-4.1`). The comment on each pull request names the model that reviewed it.
- Until the secret is set, the AI step reports that it is not set up and every pull request waits for the maintainer. Nothing is merged automatically without an AI verdict.
- It reads the mod's files as data and answers `safe`, `unsafe` or `unsure` with a short summary. Anything except `safe` stops the automatic merge.
- It also leaves **optional code suggestions** as line comments on the pull request, and answers questions you ask in the pull request. Comment on your pull request and the review runs again with your comment as context, for example to explain why the mod needs a website.
- Comments are treated as untrusted context, never as instructions. Only comments by the pull request author or the maintainer are read, and comments that try to talk the reviewer into approving are flagged and block the merge.
- Files that contain text trying to instruct the reviewer are flagged before the AI sees them, and the AI is told never to follow instructions inside the files.
- **AI review can be wrong.** It is one layer on top of the rule based checks, the sandbox, the ownership rules, the install warning for unverified mods, and the maintainer's ability to take any mod down at once. That is why automatically merged mods are never marked Verified.

The review workflow runs in the trusted context of this repository but **never checks out or runs pull request code**: it reads files through the GitHub API, and it only merges the exact commit it reviewed.

## Tags and search

Add up to 5 tags to `plugin.json`, chosen from [`tags.json`](tags.json):

```json
"tags": ["appearance", "sidebar", "tools"]
```

Voidstrap's Library search understands plain words plus these filters, which can be combined:

| Filter | Example |
| --- | --- |
| `tag:` | `tag:theme` |
| `by:` | `by:KloBraticc` |
| `is:verified`, `is:trusted`, `is:featured`, `is:installed`, `is:update`, `is:offline` | `is:verified tag:tools` |
| `sort:` | `sort:new`, `sort:updated`, `sort:name`, `sort:relevance` |
| `-word` | `theme -dark` excludes mods that mention dark |

Results are ranked by how well they match, with verified, featured and trusted mods boosted.

## Reporting a bad mod

See [SECURITY.md](SECURITY.md). Malicious mods are removed from `main` immediately, which removes them from the index, and the author can be blocked from the repository.

## FAQ

**Do I need a GitHub account to install mods?** No. Only publishing needs one.

**Why does Voidstrap ask for `public_repo`?** It needs it to fork this repository and open the pull request from your account. It cannot touch private repositories.

**I renamed my GitHub account. Can I still update my mod?** Yes. Ownership uses your numeric id, which does not change. Update the `login` in `owner.json` in your next pull request if you like (the id must stay the same).

**Someone else wants to take over my mod.** Ownership can only be moved by the maintainer, after the current owner asks in an issue.

**My pull request was closed automatically.** Read the comment on it. Usually you changed a mod you do not own, changed more than one mod, or forgot to raise the version.

## For the maintainer

### Moderation commands

Comment on **any issue or pull request** in this repository (only the maintainer account is obeyed):

| Command | Effect |
| --- | --- |
| `/verify <mod>` | Verified badge for the current files of the mod |
| `/unverify <mod>` | Remove the badge |
| `/takedown <mod> <reason>` | Hide the mod from the library at once. Voidstrap warns people who installed it and turns it off |
| `/restore <mod>` | Undo a takedown |
| `/feature <mod> <1 to 100>` | Show the mod higher in the library |
| `/unfeature <mod>` | Stop featuring it |
| `/trust <login>` | Mods by this account install without the warning |
| `/untrust <login>` | Undo |
| `/ban <login> <reason>` | Hide all their mods and auto close their pull requests |
| `/unban <login>` | Undo |

The same actions are available from **Actions, Moderate, Run workflow**, or from a terminal:

```
gh workflow run moderate.yml -R KloBraticc/voidstrap-mods-library -f action=takedown -f target=<mod> -f reason="<why>"
```

Every change is a commit on the `moderation` branch, so there is a full history. The index rebuilds automatically afterwards.

### Everything else

- `npm ci --ignore-scripts` then `npm run validate` checks every mod locally.
- `node scripts/build-index.mjs <commit> index.json [moderation.json]` builds an index locally.
- When the Voidstrap mod API changes, copy `src/Voidstrap.App/Resources/ModTypes.d.ts` from Voidstrap to `types/voidstrap.d.ts`.
- Add a host to `allowed-hosts.json` (hosts mods may send data to) or a tag to `tags.json` only in your own pull request.
- To delete a mod's files for good, remove its folder in a pull request. A takedown is faster and reversible.

