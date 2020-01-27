import cdk = require("@aws-cdk/core");
import rds = require("@aws-cdk/aws-rds");
import ec2 = require("@aws-cdk/aws-ec2");
import kms = require("@aws-cdk/aws-kms");
import custom = require("@aws-cdk/custom-resources");
import secretsmanager = require("@aws-cdk/aws-secretsmanager");
import { CheckedAwsCustomResource } from "checked-aws-custom-resource";
import { IServerlessDatabase } from "./resources/aurora-serverless";

import AWS = require("aws-sdk");
import { truncateSync } from "fs";

export interface MigrationStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

function executeStatementCall(
  physicalResourceId: string,
  parameters: AWS.RDSDataService.Types.ExecuteStatementRequest
): custom.AwsSdkCall {
  return {
    service: "RDSDataService",
    action: "executeStatement",
    parameters: parameters,
    physicalResourceId: physicalResourceId
  };
}

interface SQLStatement {
  sql: string;
  parameters: AWS.RDSDataService.Types.SqlParametersList;
}

interface MigrationParameters {
  physicalResourceId: string;
  resourceArn: string;
  secretArn: string;
  schema: string;
  upStatements: SQLStatement[];
  downStatements: SQLStatement[];
}

// function migration(params: MigrationParameters) {}

export class MigrationStack extends cdk.Stack {
  public readonly db: IServerlessDatabase;

  constructor(scope: cdk.Construct, id: string, props: MigrationStackProps) {
    super(scope, id, props);

    new CheckedAwsCustomResource(this, "ToggleDataAPI2", {
      onCreate: executeStatementCall("Migration1", {
        sql
      }),
      onUpdate: executeStatementCall("Migration1", {})
    });
  }
}
