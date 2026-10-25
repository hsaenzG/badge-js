# El Guardián del Código — backend (Phase 3)

Strands Harness agent on AWS Lambda behind API Gateway, with Amazon Bedrock (Amazon Nova) and AWS CDK. Design: [`../docs/architecture.md`](../docs/architecture.md).

## Local

```sh
npm install
npm test          # 28 tests, fake model (no AWS needed)
npm run typecheck
npm run synth     # bundle + cdk synth --strict with cdk-nag (no deploy)
```

## Deploy (needs approval: creates billable AWS resources)

```sh
aws login                                    # or your usual credentials
aws bedrock get-inference-profile --inference-profile-identifier us.amazon.nova-lite-v1:0 --region us-east-2 --profile free-tier-Strands
export AWS_PROFILE=free-tier-Strands CDK_DEFAULT_REGION=us-east-2  # account already bootstrapped in us-east-2
npm run diff -- -c budgetEmail=<you@example.com>
npm run deploy -- -c budgetEmail=<you@example.com>
```

Get the badge's API key value (never committed, never in the template):

```sh
aws apigateway get-api-key --api-key <ApiKeyId-hazel output> --include-value --query value --output text
```

Deployed: `https://rxds32bmjh.execute-api.us-east-2.amazonaws.com/prod/v1/` (API key id `1nzk2at3ob`).

Context options: `reservedConcurrency` (omit on 10-limit accounts), `modelId` (default `us.amazon.nova-lite-v1:0`), `profileRegions`, `badges` (comma-separated, one key each), `budgetEmail`, `monthlyBudgetUsd` (default 5).

Remove everything: `npx cdk destroy MictlanGuardian`.
