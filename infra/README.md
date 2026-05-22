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

There are **two stacks**:

1. **`template.yaml`** — the API: HTTP API Gateway, Lambda, DynamoDB. Deploys to `eu-north-1` (Stockholm).
2. **`budgets.yaml`** — the monthly spend alarms ($10 / $30 / $100). Deploys to `us-east-1` because AWS Budgets is a global service that CloudFormation only supports there.

### Main stack (eu-north-1)

```bash
pnpm --filter @combo/api build:lambda
sam build
sam deploy --guided                         # first time only
sam deploy                                  # subsequent dev deploys
sam deploy --config-env prod                # prod environment
```

Optional Sentry DSN:

```bash
sam deploy --parameter-overrides "Stage=dev SentryDsn=https://..."
```

### Budgets stack (us-east-1, one-shot)

```bash
aws cloudformation deploy \
  --template-file budgets.yaml \
  --stack-name comboweather-budgets \
  --region us-east-1 \
  --parameter-overrides "Stage=dev BudgetEmail=you@example.com"
```

Currency is **USD** — AWS Budgets uses the account's billing currency, and
swapping that to EUR would mean a billing-prefs change in the account.

## Stack outputs

- `ApiBaseUrl` — the public base URL (`https://<id>.execute-api.eu-north-1.amazonaws.com/<stage>`)
- `ForecastsTableName` — DynamoDB table name (also injected into the Lambda
  via the `FORECASTS_TABLE` env var)
