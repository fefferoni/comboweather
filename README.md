# ComboWeather

A cross-platform weather app (iOS + Android) that combines three independent
Scandinavian forecast providers — **SMHI**, **MET Norway**, and **DMI** — into
a single consensus forecast, with each provider still visible in its own tab.

## Status

**v0.1 — Walking skeleton (backend only).** SMHI wired up through API Gateway +
Lambda + DynamoDB, served via `GET /forecast?lat=&lon=`. MET Norway, DMI, and
the full combine algorithm land in v0.2; mobile shell in v0.3.

## Layout

```
apps/
  api/          ← Lambda handlers + provider parsers (TypeScript)
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
```

### Deploy

```bash
cd infra
sam deploy --guided   # first time only; writes samconfig.toml
sam deploy            # subsequent deploys
```

## Attribution

- Weather data: SMHI (CC-BY 4.0), MET Norway (CC-BY 4.0), DMI (free license w/
  attribution). Wired in via v0.2.

## License

MIT — see [LICENSE](./LICENSE).
