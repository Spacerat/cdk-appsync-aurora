import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");

import { AuroraServerless } from "./resources/aurora-serverless";

export interface DBStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class DBStack extends cdk.Stack {
  public readonly db: AuroraServerless;

  constructor(scope: cdk.Construct, id: string, props: DBStackProps) {
    super(scope, id, props);

    this.db = new AuroraServerless(this, "DB", {
      masterUser: {
        username: "admin"
      },
      enableDataAPI: true,
      vpc: props.vpc,
      subnets: props.vpc.isolatedSubnets
    });
  }
}
