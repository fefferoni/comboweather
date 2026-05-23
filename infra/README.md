# infra/

AWS SAM template for the ComboWeather API stack. v0.2 scope: an HTTP API
Gateway in front of a single Lambda (`forecast`) that fans out to **SMHI +
MET Norway + DMI** and combines results, a DynamoDB `Forecasts` table, and
three monthly budget alarms ($10, $30, $100).

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

## GitHub OIDC deploy role (one-time setup)

`.github/workflows/deploy-api.yml` assumes an IAM role via GitHub OIDC, so no
long-lived AWS keys live in GitHub Secrets. The trust policy and the scoped
permissions policy are tracked under `infra/iam/` so the role's configuration
is reproducible from git.

One-time AWS-side setup (already done for account `331751352222`; commands kept
here for the record):

1. **Register GitHub as an OIDC provider** in the AWS account (once per
   account):

   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. **Create the deploy role** with the tracked trust policy:

   ```bash
   aws iam create-role \
     --role-name comboweather-github-deployer \
     --assume-role-policy-document file://infra/iam/github-deployer-trust.json \
     --tags Key=Project,Value=comboweather Key=ManagedBy,Value=manual
   ```

   The trust policy ([infra/iam/github-deployer-trust.json](iam/github-deployer-trust.json))
   only allows the `main` branch of `fefferoni/comboweather` to assume the role.
   Forks, PR runs, and other branches cannot.

3. **Attach the scoped inline permissions policy:**

   ```bash
   aws iam put-role-policy \
     --role-name comboweather-github-deployer \
     --policy-name comboweather-deploy \
     --policy-document file://infra/iam/github-deployer-policy.json
   ```

   The policy ([infra/iam/github-deployer-policy.json](iam/github-deployer-policy.json))
   bounds the role to `comboweather-*` resources in `eu-north-1` and
   `us-east-1`. **Intentionally NOT `AdministratorAccess`** — a compromised
   workflow run can only touch comboweather resources, not the whole account.
   Updating the SAM template to add a new resource type may require adding an
   action to this policy and re-running `put-role-policy`.

4. **Add the role ARN to GitHub** as repository secrets:
   - `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::331751352222:role/comboweather-github-deployer`
   - `SENTRY_DSN` (optional) — passed as the `SentryDsn` SAM parameter; leave
     unset to disable Sentry in the Lambda.

After that, every push to `main` triggers a deploy.

DMI no longer needs an API key (we use the keyless `opendataapi.dmi.dk`
host). Fair-use cap is 500 req / 5 s account-wide — well within our 30-min
forecast cache.
