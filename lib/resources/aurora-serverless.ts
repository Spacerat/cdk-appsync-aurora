import cdk = require("@aws-cdk/core");
import rds = require("@aws-cdk/aws-rds");
import ec2 = require("@aws-cdk/aws-ec2");
import kms = require("@aws-cdk/aws-kms");
import custom = require("@aws-cdk/custom-resources");
import secretsmanager = require("@aws-cdk/aws-secretsmanager");
import { CheckedAwsCustomResource } from "checked-aws-custom-resource";

const DEFAULT_SCALING_CONFIG = {
  autoPause: true,
  minCapacity: 1,
  maxCapacity: 1,
  secondsUntilAutoPause: 300
};

/**
 * Username and optional login.
 */
export interface Login {
  readonly username: string;
  readonly kmsKey?: kms.IKey;
}

export interface IServerlessDatabase extends cdk.IResource {
  clusterIdentifier: string;
  clusterArn: string;
  secret: secretsmanager.ISecret;
}

export interface AuroraServerlessProps {
  masterUser: Login;
  enableDataAPI: boolean;
  vpc: ec2.IVpc;
  subnets: Array<ec2.ISubnet>;
  scalingConfiguration?: rds.CfnDBCluster.ScalingConfigurationProperty;
  name?: string;
}

export class AuroraServerless extends cdk.Resource
  implements secretsmanager.ISecretAttachmentTarget, IServerlessDatabase {
  public readonly clusterIdentifier: string;
  public readonly clusterArn: string;
  public readonly secret: secretsmanager.ISecret;

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

    const secret = new rds.DatabaseSecret(this, "Secret", {
      username: props.masterUser.username,
      encryptionKey: props.masterUser.kmsKey
    });

    const masterUsername = secret.secretValueFromJson("username").toString();

    const masterPassword = secret.secretValueFromJson("password").toString();

    // Create database cluster

    const scalingConfiguration = props.scalingConfiguration
      ? props.scalingConfiguration
      : DEFAULT_SCALING_CONFIG;

    const db = new rds.CfnDBCluster(this, "Resource", {
      databaseName: props.name,
      engine: "aurora",
      engineMode: "serverless",
      masterUsername: masterUsername,
      masterUserPassword: masterPassword,
      scalingConfiguration,
      dbSubnetGroupName: dbSubnetGroup.ref,
      vpcSecurityGroupIds: [securityGroup.securityGroupId]
    });
    this.clusterIdentifier = db.ref;

    this.secret = secret.addTargetAttachment("AttachedSecret", {
      target: this
    });

    this.clusterArn = constructArn(this.stack, db);

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
  }

  public asSecretAttachmentTarget(): secretsmanager.SecretAttachmentTargetProps {
    return {
      targetId: this.clusterIdentifier,
      targetType: secretsmanager.AttachmentTargetType.CLUSTER
    };
  }
}

function constructArn(stack: cdk.Stack, cluster: rds.CfnDBCluster): string {
  // HACK: a limitation of CloudFormation itself means that we have to construct the ARN
  // from scratch. There is no way to get a cluster's ARN programatically. 4 srs CF???
  return `arn:aws:rds:${stack.region}:${stack.account}:cluster:${cluster.ref}`;
}
