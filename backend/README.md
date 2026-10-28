# El Guardián del Código: backend (Fase 3)

**Español** · [English](README.en.md)

Agente de Strands Harness en AWS Lambda detrás de API Gateway, con Amazon Bedrock (Amazon Nova) y AWS CDK. Diseño: [`../docs/architecture.md`](../docs/architecture.md).

## Local

```sh
npm install
npm test          # 28 pruebas con un modelo falso (no necesita AWS)
npm run typecheck
npm run synth     # bundle + cdk synth --strict con cdk-nag (no despliega)
```

## Desplegar (requiere aprobación: crea recursos de AWS que cuestan)

```sh
aws login                                    # o tus credenciales de siempre
aws bedrock get-inference-profile --inference-profile-identifier us.amazon.nova-lite-v1:0 --region us-east-2 --profile free-tier-Strands
export AWS_PROFILE=free-tier-Strands CDK_DEFAULT_REGION=us-east-2  # la cuenta ya tiene bootstrap en us-east-2
npm run diff -- -c budgetEmail=<tu@email.com>
npm run deploy -- -c budgetEmail=<tu@email.com>
```

Para obtener el valor de la API key del badge (nunca va en un commit ni en la plantilla):

```sh
aws apigateway get-api-key --api-key <salida ApiKeyId-hazel> --include-value --query value --output text
```

Desplegado: `https://rxds32bmjh.execute-api.us-east-2.amazonaws.com/prod/v1/` (id de la API key `1nzk2at3ob`).

Opciones de contexto: `reservedConcurrency` (omítela en cuentas con límite de 10), `modelId` (por defecto `us.amazon.nova-lite-v1:0`), `profileRegions`, `badges` (separados por comas, una key por badge), `budgetEmail`, `monthlyBudgetUsd` (por defecto 5).

Para borrar todo: `npx cdk destroy MictlanGuardian`.
