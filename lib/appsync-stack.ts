import cdk = require("@aws-cdk/core");
import appsync = require("@aws-cdk/aws-appsync");
import iam = require("@aws-cdk/aws-iam");
import { AppSyncRelationalDatasource } from "./resources/appsync/relational-datasource";

import { readFileSync } from "fs";

export interface DBConfig {
  awsRegion: string;
  awsSecretStoreArn: string;
  databaseName: string;
  clusterArn: string;
}

export interface AppSyncStackProps extends cdk.StackProps {
  dbConfig: DBConfig;
}

export class AppSyncStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: AppSyncStackProps) {
    super(scope, id, props);

    const api = new appsync.CfnGraphQLApi(this, "API", {
      name: `my-awesome-api-for-${id}`,
      authenticationType: "API_KEY"
    });

    const schemaDescription = readFileSync(`${__dirname}/api/schema.graphql`, {
      encoding: "utf8"
    });

    const schema = new appsync.CfnGraphQLSchema(this, "Schema", {
      apiId: api.attrApiId,
      definition: schemaDescription
    });

    const dataSource = new AppSyncRelationalDatasource(this, "DataSource", {
      name: "AuraraDataSource",
      description: "Connection to test DB",
      apiId: api.attrApiId,
      awsRegion: props.dbConfig.awsRegion,
      clusterArn: props.dbConfig.clusterArn,
      databaseName: props.dbConfig.databaseName,
      awsSecretStoreArn: props.dbConfig.awsSecretStoreArn
    });
  }
}
