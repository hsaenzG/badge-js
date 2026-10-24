#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { GuardianStack } from "./stack";

const app = new cdk.App();

const ctx = (k: string): string | undefined => app.node.tryGetContext(k);
const region = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

new GuardianStack(app, "MictlanGuardian", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  modelId: ctx("modelId") ?? "us.amazon.nova-lite-v1:0",
  // regions the "us." inference profile may route to; verify with `aws bedrock get-inference-profile`
  profileRegions: (ctx("profileRegions") ?? "us-east-1,us-east-2,us-west-2").split(","),
  budgetEmail: ctx("budgetEmail"),
  monthlyBudgetUsd: Number(ctx("monthlyBudgetUsd") ?? 5),
  badges: (ctx("badges") ?? "hazel").split(","),
  description: "Mictlán.js — El Guardián del Código (Phase 3, Hazel Badge OS)",
  tags: { project: "hazel-badge-os", phase: "3" },
});

cdk.Validations.of(app).addPlugins(new AwsSolutionsChecks(app, { verbose: true }));
