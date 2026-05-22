# infra/

AWS SAM template for the ComboWeather API stack. v0.1 scope: an HTTP API
Gateway in front of a single Lambda (`forecast`), a DynamoDB `Forecasts`
table, and three monthly budget alarms (€10, €30, €100).

## Prerequisites

- AWS SAM CLI (`brew install aws-sam-cli` / scoop / etc.)
- AWS credentials with permission to deploy CloudFormation, Lambda, DynamoDB,
  API Gateway, IAM roles, and AWS Budgets
- Docker (only required for `sam local`)

## Local development

The Lambda is pre-bundled by esbuild into `apps/api/.lambda-build/` before
SAM packages it. That sidesteps SAM's npm-based builder choking on pnpm's
`workspace:*` protocol when resolving the `@combo/shared` dependency.

```bash
pnpm install                              # once
pnpm --filter @combo/api build:lambda     # bundle the Lambda (rerun on src changes)
cd infra
sam build                                 # packages the prebuilt bundle
sam local start-api                       # boots API GW + Lambda locally on :3000
```

Then in another shell:

```bash
curl 'http://localhost:3000/forecast?lat=59.33&lon=18.07'
```

> Local DynamoDB: `sam local` runs the Lambda but does **not** spin up
> DynamoDB. For an offline cache layer, run DynamoDB Local
> (`docker run -p 8000:8000 amazon/dynamodb-local`), set
> `DYNAMO_LOCAL_ENDPOINT=http://host.docker.internal:8000` in your environment,
> and create the table with the AWS CLI pointed at `--endpoint-url=...`.

## Deploy

First-time guided deploy writes the `samconfig.toml` defaults; subsequent
deploys use them.

```bash
sam build
sam deploy --guided                         # first time only
sam deploy                                  # subsequent dev deploys
sam deploy --config-env prod                # prod environment
```

Pass a real email to receive the budget alarms:

```bash
sam deploy --parameter-overrides "BudgetEmail=you@example.com SentryDsn=https://..."
```

Without `BudgetEmail`, the three Budgets resources are skipped (handy for
sandbox accounts).

## Stack outputs

- `ApiBaseUrl` — the public base URL (`https://<id>.execute-api.eu-north-1.amazonaws.com/<stage>`)
- `ForecastsTableName` — DynamoDB table name (also injected into the Lambda
  via the `FORECASTS_TABLE` env var)
