# Contributing

Thanks for sharing your Voidstrap mod. The easiest way is the **Publish** button in Voidstrap, which handles everything below for you. See the [README](README.md#publishing-a-mod).

## Pull request checklist

- [ ] The pull request changes exactly one folder: `mods/<your-mod-name>/`.
- [ ] `owner.json` holds **your** numeric GitHub user id and login (`https://api.github.com/users/<login>` shows the id).
- [ ] `.voidstrap-mod/plugin.json` `name` matches the folder name.
- [ ] For an update, `version` is higher than the published one and `owner.json` is unchanged.
- [ ] Every host the mod contacts is listed in `network`, and the description says what is sent.
- [ ] `npm run validate -- <your-mod-name>` passes.
- [ ] Python dependencies from `scripts/media-requirements.txt` are installed for local media checking.
- [ ] Sprite sheets declare cell dimensions in `media.json`; every bundled image and animation passes local checking.
- [ ] The code is readable, not minified, packed or obfuscated.

## Ownership

The first account to publish a mod owns it. Only that account (matched by numeric id) can update or remove it. Pull requests that change someone else's mod are **closed automatically**.

To ask for a change to someone else's mod, open an issue and mention the owner. To take over an abandoned mod, open an issue: the maintainer moves ownership only when the current owner agrees, or when the mod has been unmaintained for a long time and broken.

## Not accepted

Cheats and exploits, anything that touches Roblox logins, hidden or encoded code, crypto miners, trackers, ads, copied mods, and anything against the Roblox or GitHub terms. See [Rules](README.md#rules).

## Changing the checks

Files outside `mods/` (workflows, scripts, `allowed-hosts.json`, types) are maintained by the maintainer only. Suggest changes in an issue.
