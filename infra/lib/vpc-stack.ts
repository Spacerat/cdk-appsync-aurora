import cdk = require("@aws-cdk/core");
import ec2 = require("@aws-cdk/aws-ec2");

export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "VPC", {
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "publicnet",
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: "isolatednet",
          subnetType: ec2.SubnetType.ISOLATED
        }
      ],
      maxAzs: 2
    });
  }
}
