# Custom Dispatcharr UI (mobile-first)

A replacement frontend for Dispatcharr. It uses a bottom tab bar on phones and a sidebar on desktop, and installs as a PWA.

## How it stays patchable

- `../frontend/` is upstream's frontend and is **never edited** in this fork, so `git merge upstream/main` applies cleanly.
- This UI imports upstream's data layer (api, zustand stores, websocket, utils) and its forms and modals **only** through `src/core/upstream.js`. If an upstream refactor moves something, the build fails in that one file. Fix the path there.
- `vite.config.js` resolves upstream's bare imports from this package's `node_modules`, so `../frontend` never needs `npm install`.

## Modules

Each folder in `src/modules/<name>/` that has a `module.js(x)` is picked up automatically (see `src/core/registry.js`).

| Module | What it is |
|---|---|
| channels | Searchable channel list with group chips, now-playing info and an action sheet (play, edit, copy URL, delete) |
| guide | "What's on at [time]" list with a time strip and per-channel schedule. Record and details use the upstream modal |
| dvr | Recording / Upcoming / Recorded tabs. Uses upstream details and record forms |
| stats | "Activity": live channels and clients, stop controls |
| vods | Poster grid with infinite scroll. Uses upstream movie and series modals |
| sources | M3U and EPG lists: enable toggle, refresh, edit (upstream forms) |
| settings | Index built from upstream `settingsNav`, so new upstream sections appear automatically |
| legacy | Every stock upstream page at priority -100, plus `/classic/<path>` copies |

- **Replace a page:** add a module with the same `id`.
- **Revert to stock:** set `enabled: false` on the custom module. The legacy page takes over.
- **Expose a new upstream page:** add one entry in `modules/legacy/module.jsx`.

Upstream modals are made full-screen on phones by `src/styles/legacy-overrides.css`.

## Updating from upstream

```bash
git fetch upstream && git merge upstream/main
cd frontend-mobile && npm run sync-deps && npm install && npm run build
```

## Build and run

```bash
docker build -f docker/Dockerfile.custom -t custom-dispatcharr .
# Dev: hot-swap into a running container
./frontend-mobile/scripts/deploy-to-container.sh <container-name>
```

## Known gaps / TODO

- Automated tap tests on the Channels list were still failing at handoff, likely a leftover overlay. Verify on a real phone.
- The guide shows placeholder programs until a working EPG source is added.
- iOS Safari can't play live MPEG-TS in the browser. The player offers "copy stream URL" for VLC.
