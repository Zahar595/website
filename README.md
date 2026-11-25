# 🐤 Flappy Bird 3D

A 3D Flappy Bird built with **React + three.js (react-three-fiber)** and deployed on **Vercel**,
with a **live global leaderboard** that updates while you play.

**Play:** https://flappy-bird-3d-zahar595.vercel.app
_(if Vercel asks you to log in, the project's Deployment Protection is still on — see [Deployment](#deployment))_

[Vercel project](https://vercel.com/zahar595/flappy-bird-3d)

![stack](https://img.shields.io/badge/react-18-61dafb) ![stack](https://img.shields.io/badge/three.js-r169-black) ![stack](https://img.shields.io/badge/deploy-vercel-black)

## Features

- **Real 3D scene** — low-poly bird with animated flapping wings, glossy pipes, a sky-dome
  gradient shader, drifting clouds, pine forest, rolling hills, soft shadows and depth fog.
- **60 fps gameplay loop** — the simulation lives outside React (mutable state stepped in
  `useFrame`), so scores, pipe collision and camera follow never trigger re-renders.
  Frame-time spikes are clamped so a background tab can't teleport you through a pipe.
- **Live leaderboard** — polls `/api/leaderboard` every 4s, keeps a "birds flying now"
  presence heartbeat, shows your new score instantly (optimistic insert) and highlights your row.
- **Procedural audio** — flap/score/crash sounds synthesised with WebAudio, zero audio assets.
- **Game feel** — screen shake on crash, bird pitch, wing flap boost, score pop animation,
  medals (Rookie → Platinum), personal best in `localStorage`, keyboard + touch controls.
- **Responsive** — desktop side panel collapses into a bottom sheet on phones.

## Controls

| Action | Input |
| --- | --- |
| Flap / start | `Space`, `↑`, `W`, click, tap |
| Mute | `M` or the 🔊 button |
| Leaderboard | 🏆 button |

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run dev` also serves the `/api` handlers through a tiny Vite middleware, so the
leaderboard works locally exactly like it does in production.

```bash
npm run build    # static build into dist/
```

## Live leaderboard storage

`api/leaderboard.js` is a single serverless function (single file on purpose, so the
in-memory fallback is shared between reads and writes).

| Env vars present | Storage |
| --- | --- |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV) or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Redis sorted set — scores are shared by every instance and survive cold starts |
| none | Process memory — a real working board, but scoped to one warm instance and reset on cold start |

To make the board permanent, connect **Upstash Redis** (or Vercel KV) to the project in the
Vercel dashboard; the function picks the env vars up automatically, no code change needed.
`GET /api/leaderboard` reports which backend it is using via the `storage` field.

### API

```http
GET  /api/leaderboard?limit=20&playerId=abc   -> { top: [...], live, storage }
POST /api/leaderboard                          -> { action: "submit", name, score, playerId }
POST /api/leaderboard                          -> { action: "ping", playerId }
```

Scores are validated (integer `0…999`), names sanitised to 14 characters, and writes are
rate limited per IP.

## Deployment

The site is deployed on Vercel from this repository's branch as a production deployment
(`npm install` → `npm run build` → `dist/`, plus `api/leaderboard.js` as a Node function).

One account-level note: new Vercel accounts default to **Standard Protection**
(`ssoProtection.deploymentType = all_except_custom_domains`). Because this project has no
custom domain, *every* URL — including the production `*.vercel.app` alias — sits behind a
Vercel login wall for anonymous visitors. To make it public, open
**Project → Settings → Deployment Protection → Vercel Authentication → Disabled**
(or attach a custom domain, which is exempt).

## Structure

```
api/leaderboard.js      serverless leaderboard (Redis or in-memory)
src/game/engine.js      pure simulation: gravity, pipes, collision, scoring
src/game/audio.js       WebAudio sound effects
src/scene/Scene.jsx     canvas, sky shader, lights, camera rig, game loop driver
src/scene/Bird.jsx      the bird
src/scene/Pipes.jsx     pooled pipe pairs
src/scene/World.jsx     ground, forest, clouds, hills, sun
src/components/         HUD overlays + leaderboard panel
src/App.jsx             state, input, death/submission flow
```
