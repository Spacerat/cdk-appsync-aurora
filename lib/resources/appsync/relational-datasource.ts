import cdk = require("@aws-cdk/core");
import appsync = require("@aws-cdk/aws-appsync");
import iam = require("@aws-cdk/aws-iam");

export interface RelationalDatasourceProps {
  name: string;
  description?: string;
  apiId: string;
  awsRegion: string;
  awsSecretStoreArn: string;
  databaseName: string;
  clusterArn: string;
}

/**
 * An AppSync DataSource for Aurora Serverless
 */
export class AppSyncRelationalDatasource extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: RelationalDatasourceProps
  ) {
    super(scope, id);

    const role = new iam.Role(this, "DataSourceServiceRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com")
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "rds-data:DeleteItems",
          "rds-data:ExecuteSql",
          "rds-data:ExecuteStatement",
          "rds-data:GetItems",
          "rds-data:InsertItems",
          "rds-data:UpdateItems"
        ],
        resources: [props.clusterArn, `${props.clusterArn}:*`]
      })
    );

    new appsync.CfnDataSource(this, "Resource", {
      apiId: props.apiId,
      name: props.name,
      description: props.description,
      type: "RELATIONAL_DATABASE",
      relationalDatabaseConfig: {
        relationalDatabaseSourceType: "RDS_HTTP_ENDPOINT",
        rdsHttpEndpointConfig: {
          awsRegion: props.awsRegion,
          awsSecretStoreArn: props.awsSecretStoreArn,
          dbClusterIdentifier: props.clusterArn,
          databaseName: props.databaseName,
          schema: "mysql"
        }
      },
      serviceRoleArn: role.roleArn
    });
  }
}
