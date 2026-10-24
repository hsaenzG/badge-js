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
aws bedrock get-inference-profile --inference-profile-identifier us.amazon.nova-lite-v1:0 --region us-east-1
npx cdk bootstrap aws://<account>/us-east-1  # once per account/region
npm run diff -- -c budgetEmail=<you@example.com>
npm run deploy -- -c budgetEmail=<you@example.com>
```

Get the badge's API key value (never committed, never in the template):

```sh
aws apigateway get-api-key --api-key <ApiKeyId-hazel output> --include-value --query value --output text
```

Context options: `modelId` (default `us.amazon.nova-lite-v1:0`), `profileRegions`, `badges` (comma-separated, one key each), `budgetEmail`, `monthlyBudgetUsd` (default 5).

Remove everything: `npx cdk destroy MictlanGuardian`.
