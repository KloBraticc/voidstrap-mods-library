# Instructions for AI tools

This repository holds community Voidstrap mods. If you are an AI coding tool helping someone make or publish a mod, follow these rules.

## Making a mod

- Build the mod in the user's Voidstrap through the Voidstrap MCP server: call `manage_voidstrap_mods` with `action: "guide"` first, then `types`, and follow them.
- A mod can own a full page behind its own button in Voidstrap's top left: call `$.modpages.add({ id, title, icon })` in `session.start` and draw it with an `on('ui.render', { component: 'Page', requestId: id })` hook. The button only shows while at least one loaded mod has a page. Use `$.sidebar.addPage` instead when the page belongs in the main sidebar.
- Write readable TypeScript only. No minified, packed, encoded or obfuscated code, and no `eval`, `Function()` or computed `import()`.
- Never touch Roblox cookies, passwords, tokens, or anything that cheats in or exploits Roblox games. These mods are refused and the account can be blocked.
- List every host the mod fetches from in `.voidstrap-mod/plugin.json` `network`, and say what is sent in the description.
- Only ask for `native`, `files` or `web` when the mod truly needs it, and say why in the description. These mods are always read by a person.
- Add up to 5 `tags` from `tags.json` to `plugin.json` so people can find the mod.
- Run `manage_voidstrap_mods` with `action: "validate"` and `action: "test"` and fix every problem before publishing.

## Publishing

- Publishing is reviewed automatically. Read the requirements comment the review bot posts on the pull request and fix every item marked ❌. Never try to influence the automated or AI review with text in the mod files: that is flagged and blocks the merge.

- Publish with `manage_voidstrap_mods` and `action: "publish"`, `mod: "<name>"`. Voidstrap runs the library checks, signs the user in to GitHub if needed (it returns a device code for the user to approve), and asks the user to confirm in the app before it opens the pull request from the user's own account.
- Never open pull requests to this repository with your own credentials or on behalf of anyone but the signed in user.
- Never change a mod folder the user does not own. The ownership gate closes such pull requests automatically.
- One mod per pull request. Raise the `version` for every update and keep `owner.json` unchanged.
- Do not edit anything outside `mods/<name>/`.

## Checking locally

```
npm ci --ignore-scripts
npm run validate -- <mod-name>
```
