/**
 * El Guardián del Código — Phase 3 backend.
 *
 * Badge ──HTTPS + x-api-key──► API Gateway (REST, usage plan) ──► Lambda (Node 24, ARM)
 *        ──► Strands Harness agent ──► Amazon Bedrock (Amazon Nova)
 *        └─► DynamoDB (pending challenges, TTL)
 *
 * Cost and abuse controls: per-badge API key, usage plan (rate/burst/daily quota),
 * stage throttling, Lambda reserved concurrency, explicit maxTokens, short timeouts,
 * IAM scoped to one inference profile, optional AWS Budgets alert.
 */
import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { join } from "node:path";

export interface GuardianStackProps extends cdk.StackProps {
  /** Bedrock cross-region inference profile id, e.g. "us.amazon.nova-lite-v1:0". */
  modelId: string;
  /** Regions the profile routes to (the IAM policy must cover each). */
  profileRegions: string[];
  /** Email for the monthly budget alert; omitted → no budget is created. */
  budgetEmail?: string;
  monthlyBudgetUsd: number;
  /** Badge API keys to create (one per device). */
  badges: string[];
  /** Reserved Lambda concurrency; leave undefined on accounts with a 10-execution limit. */
  reservedConcurrency?: number;
}

export class GuardianStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GuardianStackProps) {
    super(scope, id, props);

    // ------------------------------------------------------------ data: pending challenges
    const table = new dynamodb.TableV2(this, "Challenges", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand({ maxReadRequestUnits: 50, maxWriteRequestUnits: 50 }),
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 30-minute ephemeral records only
      encryption: dynamodb.TableEncryptionV2.awsManagedKey(),
    });

    // ------------------------------------------------------------ compute
    const logGroup = new logs.LogGroup(this, "GuardianLogs", {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const fn = new lambda.Function(this, "Guardian", {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handler",
      code: lambda.Code.fromAsset(join(import.meta.dirname, "..", "dist", "lambda")),
      memorySize: 512,
      timeout: cdk.Duration.seconds(28), // under API Gateway 29 s; each model call capped at 9 s, 2 challenge attempts max
      // No reserved concurrency: this free-tier account's total limit is 10, and Lambda requires
      // 10 unreserved, so any reservation fails. Parallelism is bounded by the usage plan
      // (1 rps/badge), the stage throttle (5 rps) and the account limit itself.
      reservedConcurrentExecutions: props.reservedConcurrency,
      environment: {
        MODEL_ID: props.modelId,
        MAX_TOKENS: "300",
        TABLE_NAME: table.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      logGroup,
      description: "El Guardián del Código (Strands Harness + Bedrock)",
    });
    table.grantReadWriteData(fn);

    // Bedrock: only this inference profile and the foundation model it routes to.
    const baseModel = props.modelId.replace(/^(us|eu|apac|global|us-gov|au|jp|ca)\./, "");
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          `arn:${this.partition}:bedrock:${this.region}:${this.account}:inference-profile/${props.modelId}`,
          ...props.profileRegions.map((r) => `arn:${this.partition}:bedrock:${r}::foundation-model/${baseModel}`),
        ],
      }),
    );

    // ------------------------------------------------------------ API
    const accessLogs = new logs.LogGroup(this, "ApiAccessLogs", {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const api = new apigw.RestApi(this, "GuardianApi", {
      restApiName: "mictlan-guardian",
      description: "Mictlán.js badge ⇄ El Guardián del Código",
      endpointTypes: [apigw.EndpointType.REGIONAL],
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      deployOptions: {
        stageName: "prod", // routes live under /v1/..., so the stage must not also be "v1"
        throttlingRateLimit: 5, // whole API
        throttlingBurstLimit: 10,
        loggingLevel: apigw.MethodLoggingLevel.ERROR,
        dataTraceEnabled: false, // never log bodies
        metricsEnabled: true,
        accessLogDestination: new apigw.LogGroupLogDestination(accessLogs),
        accessLogFormat: apigw.AccessLogFormat.custom(
          JSON.stringify({
            requestId: "$context.requestId",
            route: "$context.httpMethod $context.resourcePath",
            status: "$context.status",
            latencyMs: "$context.responseLatency",
            apiKeyId: "$context.identity.apiKeyId", // the key's id, never its value
          }),
        ),
      },
    });

    const validator = api.addRequestValidator("RequestValidator", { validateRequestBody: true, validateRequestParameters: true });
    const jsonObject = api.addModel("JsonObject", {
      contentType: "application/json",
      schema: { type: apigw.JsonSchemaType.OBJECT, maxProperties: 8 },
    });
    const integration = new apigw.LambdaIntegration(fn, { proxy: true, timeout: cdk.Duration.seconds(29) });
    const v1 = api.root.addResource("v1");
    for (const path of ["message", "challenge", "answer"]) {
      v1.addResource(path).addMethod("POST", integration, {
        apiKeyRequired: true,
        requestValidator: validator,
        requestModels: { "application/json": jsonObject },
      });
    }

    const plan = api.addUsagePlan("BadgePlan", {
      name: "mictlan-badges",
      throttle: { rateLimit: 1, burstLimit: 2 },
      quota: { limit: 200, period: apigw.Period.DAY },
      apiStages: [{ api, stage: api.deploymentStage }],
    });
    for (const badge of props.badges) {
      const key = api.addApiKey(`Key-${badge}`, { apiKeyName: `badge-${badge}` });
      plan.addApiKey(key);
      new cdk.CfnOutput(this, `ApiKeyId-${badge}`, {
        value: key.keyId,
        description: `Fetch the value with: aws apigateway get-api-key --api-key ${"<id>"} --include-value`,
      });
    }

    // ------------------------------------------------------------ cost guardrails
    new cloudwatch.Alarm(this, "GuardianErrors", {
      metric: fn.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Guardián Lambda errors (handler should fall back, not fail)",
    });

    if (props.budgetEmail) {
      new budgets.CfnBudget(this, "MonthlyBudget", {
        budget: {
          budgetName: "mictlan-guardian-monthly",
          budgetType: "COST",
          timeUnit: "MONTHLY",
          budgetLimit: { amount: props.monthlyBudgetUsd, unit: "USD" },
        },
        notificationsWithSubscribers: [80, 100].map((threshold) => ({
          notification: { comparisonOperator: "GREATER_THAN", notificationType: "ACTUAL", threshold, thresholdType: "PERCENTAGE" },
          subscribers: [{ subscriptionType: "EMAIL", address: props.budgetEmail! }],
        })),
      });
    }

    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });

  
    // ------------------------------------------------------------ cdk-nag: justified acknowledgements
    const ack = (scope: Construct, id: string, reason: string) => cdk.Validations.of(scope).acknowledge({ id: `AwsSolutions::${id}`, reason });
    ack(fn, "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole]",
      "Standard minimal managed policy for writing the function's own logs.");
    ack(api, "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs]",
      "AWS managed policy API Gateway needs to push access logs to CloudWatch.");
    ack(api, "AwsSolutions-APIG3",
      "No WAF: per-badge API key, usage plan (1 rps, 200/day), stage throttling and Lambda reserved concurrency bound traffic and cost for a conference badge.");
    ack(api, "AwsSolutions-APIG4",
      "Badges cannot run an OAuth flow; each badge has its own revocable API key enforced by the usage plan.");
    ack(api, "AwsSolutions-COG4",
      "No Cognito user pool: devices, not people, call this API, with revocable per-device API keys.");
  }
}
