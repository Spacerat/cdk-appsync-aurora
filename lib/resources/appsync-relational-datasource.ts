import cdk = require("@aws-cdk/core");
import appsync = require("@aws-cdk/aws-appsync");
import iam = require("@aws-cdk/aws-iam");
import secretsmanager = require("@aws-cdk/aws-secretsmanager");

export type Action =
  | "ExecuteSql"
  | "ExecuteStatement"
  | "GetItems"
  | "DeleteItems"
  | "UpdateItems"
  | "InsertItems";

export type AllowedActions = Action[];

export interface DBConfig {
  awsRegion: string;
  dbSecret: secretsmanager.ISecret;
  databaseName: string;
  clusterArn: string;
}

export interface RelationalDatasourceProps {
  name: string;
  description?: string;
  apiId: string;
  dbConfig: DBConfig;
  access?: AllowedActions;
}

/**
 * An AppSync DataSource for Aurora Serverless
 */
export class AppSyncRelationalDatasource extends cdk.Construct {
  public readonly dataSourceName: string;
  constructor(
    scope: cdk.Construct,
    id: string,
    props: RelationalDatasourceProps
  ) {
    super(scope, id);

    const { awsRegion, dbSecret, databaseName, clusterArn } = props.dbConfig;

    let access: AllowedActions = props.access
      ? props.access
      : ["GetItems", "ExecuteSql", "ExecuteStatement"];

    const role = new iam.Role(this, "DataSourceServiceRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com")
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: (access as Action[]).sort().map(x => `rds-data:${x}`),
        resources: [clusterArn, `${clusterArn}:*`]
      })
    );
    dbSecret.grantRead(role);

    const roleArn = role.roleArn;

    const dataSource = new appsync.CfnDataSource(this, "Resource", {
      apiId: props.apiId,
      name: props.name,
      description: props.description,
      type: "RELATIONAL_DATABASE",
      relationalDatabaseConfig: {
        relationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
        rdsHttpEndpointConfig: {
          awsRegion: awsRegion,
          awsSecretStoreArn: dbSecret.secretArn,
          dbClusterIdentifier: clusterArn,
          databaseName: databaseName,
          schema: "mysql"
        }
      },
      serviceRoleArn: roleArn
    });

    this.dataSourceName = dataSource.attrName;
  }
}
