import cdk = require("@aws-cdk/core");
import appsync = require("@aws-cdk/aws-appsync");

export class AppSyncStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);
  }
}
