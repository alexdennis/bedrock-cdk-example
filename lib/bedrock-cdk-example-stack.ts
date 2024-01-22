import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { BedrockAgent } from "bedrock-agents-cdk";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class BedrockCdkExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "AgentBucket");

    // Upload schema to S3
    new s3deploy.BucketDeployment(this, "Deployment", {
      sources: [s3deploy.Source.asset("./schema")],
      destinationBucket: bucket,
    });

    const pathToLambdaFile = "../lambda";
    const s3BucketName = bucket.bucketName;
    const s3ObjectKey = "schema.json";

    // Setup the Agent Resource Role
    const agentResourceRoleArn = new iam.Role(this, "BedrockAgentRole", {
      roleName: "AmazonBedrockExecutionRoleForAgents_agent_test",
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    }).roleArn;

    // Setup the Lambda Function Role
    const lambdaFunctionRole = new iam.Role(
      this,
      "BedrockAgentLambdaFunctionRole",
      {
        roleName: "BedrockAgentLambdaFunctionRole",
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
        ],
      }
    );

    // Refer to https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
    const actionGroupExecutor = new lambda.Function(
      this,
      "BedrockAgentActionGroupExecutor",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "lambda.handler",
        code: lambda.Code.fromAsset(path.join(__dirname, pathToLambdaFile)),
        timeout: cdk.Duration.seconds(600),
        memorySize: 1024,
        role: lambdaFunctionRole,
      }
    );

    const agent = new BedrockAgent(this, "BedrockAgent", {
      agentName: "BedrockAgent",
      instruction:
        "This is a test instruction. You were built by AWS CDK construct to answer all questions.",
      agentResourceRoleArn: agentResourceRoleArn,
      actionGroups: [
        {
          actionGroupName: "BedrockAgentActionGroup",
          actionGroupExecutor: actionGroupExecutor.functionArn,
          s3BucketName: s3BucketName,
          s3ObjectKey: s3ObjectKey,
        },
      ],
    });
  }
}
