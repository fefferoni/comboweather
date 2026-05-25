# `docs/` — GitHub Pages source

This folder is the source for the ComboWeather GitHub Pages site, currently used to host the privacy policy linked from the in-app About screen.

## One-time Pages setup

After this folder lands on `main`, enable GitHub Pages once:

1. Go to **Settings → Pages** on the GitHub repo.
2. **Source**: *Deploy from a branch*.
3. **Branch**: `main` · **Folder**: `/docs`.
4. Save.

After the first deploy, the site is live at:

- Home: <https://fefferoni.github.io/comboweather/>
- Privacy: <https://fefferoni.github.io/comboweather/privacy/>

The mobile About screen links to the privacy URL directly. If the slug or hosting changes, update `apps/mobile/app/about.tsx`'s `LINKS.privacy` to match.

## Updating the privacy policy

Edit `docs/privacy.md` and bump the **Effective date** at the top. Material changes should also be summarized in the GitHub release notes for the version that ships them. The About screen does not need a release to reflect updated policy text — the URL is fixed.
