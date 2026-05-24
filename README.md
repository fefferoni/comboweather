# ComboWeather

A cross-platform weather app (iOS + Android) that combines three independent
Scandinavian forecast providers — **SMHI**, **MET Norway**, and **DMI** — into
a single consensus forecast, with each provider still visible in its own tab.

## Status

**v0.4 — Drill-down, favorites, search, settings, i18n.** Mobile app extends
the v0.3 shell with hourly drill-down, a 7-day long-range view, persistent
favorites, free-text location search (via a backend Nominatim proxy), a
settings screen (theme / language / wind units), and Swedish + English UI.
Bundled MET weather icons replace the v0.3 emoji glyphs.

## Layout

```
apps/
  api/          ← Lambda handlers + provider parsers (TypeScript)
  mobile/       ← Expo + Expo Router app (TypeScript, NativeWind)
packages/
  shared/       ← combine algorithm + canonical forecast types (shared by api + mobile)
infra/          ← AWS SAM template (API Gateway + Lambda + DynamoDB)
.github/
  workflows/    ← CI: lint + Vitest + coverage gate
```

## Prerequisites

- Node 20+
- pnpm 9+
- AWS SAM CLI (for local Lambda + deploy)
- AWS credentials configured (for deploy only)

## Quick start

```bash
pnpm install
pnpm test           # vitest across all workspaces
pnpm typecheck      # tsc --noEmit across all workspaces
pnpm lint
```

### Run the API locally

```bash
cd infra
sam build
sam local start-api
curl 'http://localhost:3000/forecast?lat=59.33&lon=18.07'
curl 'http://localhost:3000/search?q=stockholm&lang=sv'
```

### Deploy

```bash
cd infra
sam deploy --guided   # first time only; writes samconfig.toml
sam deploy            # subsequent deploys
```

### Run the mobile app

```bash
pnpm --filter @combo/mobile start    # scan the QR code with Expo Go on iOS / Android
```

Defaults to the production API. Point at a local `sam local start-api` by setting
`EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000` before `start`. Sentry stays
no-op until you set `EXPO_PUBLIC_SENTRY_DSN`.

## Attribution

- Weather data: SMHI (CC-BY 4.0), MET Norway (CC-BY 4.0), DMI (free license w/
  attribution). Provider tabs link out to each provider's terms; the Combo tab
  shows a `Data: SMHI · MET Norway · DMI` footer.

## License

MIT — see [LICENSE](./LICENSE).
