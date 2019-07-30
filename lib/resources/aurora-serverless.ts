import cdk = require("@aws-cdk/core");
import rds = require("@aws-cdk/aws-rds");
import ec2 = require("@aws-cdk/aws-ec2");
import kms = require("@aws-cdk/aws-kms");
import custom = require("@aws-cdk/custom-resources");
import { CheckedAwsCustomResource } from "checked-aws-custom-resource";

const DEFAULT_SCALING_CONFIG = {
  autoPause: true,
  minCapacity: 1,
  maxCapacity: 1,
  secondsUntilAutoPause: 300
};

/**
 * Username and password combination
 */
export interface Login {
  readonly username: string;
  readonly password?: cdk.SecretValue;
  readonly kmsKey?: kms.IKey;
}

export interface AuroraServerlessProps {
  masterUser: Login;
  enableDataAPI: boolean;
  vpc: ec2.IVpc;
  subnets: Array<ec2.ISubnet>;
  scalingConfiguration?: rds.CfnDBCluster.ScalingConfigurationProperty;
}

export class AuroraServerless extends cdk.Construct {
  public readonly cluster: rds.CfnDBCluster;

  constructor(scope: cdk.Construct, id: string, props: AuroraServerlessProps) {
    super(scope, id);

    // Configure networking

    const dbSubnetGroup = new rds.CfnDBSubnetGroup(this, "DbSubnetGroup", {
      subnetIds: props.subnets.map(x => x.subnetId),
      dbSubnetGroupDescription: `subnet group for Aurora DB: ${id}`,
      dbSubnetGroupName: `${id}-subnet-group`.toLocaleLowerCase()
    });

    const securityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc: props.vpc,
      description: `Security group for Aurora DB: ${id}`
    });

    // Make login info from secret

    let secret;
    if (!props.masterUser.password) {
      secret = new rds.DatabaseSecret(this, "Secret", {
        username: props.masterUser.username,
        encryptionKey: props.masterUser.kmsKey
      });
    }
    const masterUsername = secret
      ? secret.secretValueFromJson("username").toString()
      : props.masterUser.username;

    const masterPassword = secret
      ? secret.secretValueFromJson("password").toString()
      : props.masterUser.password
      ? props.masterUser.password.toString()
      : undefined;

    // Create database cluster

    const scalingConfiguration = props.scalingConfiguration
      ? props.scalingConfiguration
      : DEFAULT_SCALING_CONFIG;

    const db = new rds.CfnDBCluster(this, "Resource", {
      engine: "aurora",
      engineMode: "serverless",
      masterUsername: masterUsername,
      masterUserPassword: masterPassword,
      scalingConfiguration,
      dbSubnetGroupName: dbSubnetGroup.ref,
      vpcSecurityGroupIds: [securityGroup.securityGroupId]
    });

    // Configure Data API

    const updateDataAPI = (value: boolean): custom.AwsSdkCall => ({
      service: "RDS",
      action: "modifyDBCluster",
      parameters: {
        DBClusterIdentifier: db.ref,
        EnableHttpEndpoint: value
      },
      physicalResourceId: `${db.dbClusterIdentifier}DataApiToggle`
    });

    new CheckedAwsCustomResource(this, "ToggleDataAPI2", {
      onCreate: updateDataAPI(props.enableDataAPI),
      onUpdate: updateDataAPI(props.enableDataAPI)
    });

    this.cluster = db;
  }
}
