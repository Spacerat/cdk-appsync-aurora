import cdk = require("@aws-cdk/core");
import appsync = require("@aws-cdk/aws-appsync");
import iam = require("@aws-cdk/aws-iam");
import {
  AppSyncRelationalDatasource,
  DBConfig
} from "./resources/appsync-relational-datasource";

import { readFileSync } from "fs";
import { JsonPattern } from "@aws-cdk/aws-logs";

const ENC_UTF8 = { encoding: "utf8" };

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

    const schema = new appsync.CfnGraphQLSchema(this, "Schema", {
      apiId: api.attrApiId,
      definition: readFileSync(`${__dirname}/api/schema.graphql`, ENC_UTF8)
    });

    const apiKey = new appsync.CfnApiKey(this, "ApiKey", {
      apiId: api.attrApiId,
      description: "An API Key"
    });

    const dataSource = new AppSyncRelationalDatasource(this, "DataSource", {
      name: "AuroraDataSource",
      description: "Connection to test DB",
      apiId: api.attrApiId,
      dbConfig: props.dbConfig
    });

    const resolver = new appsync.CfnResolver(this, "ListThingsAPI", {
      apiId: api.attrApiId,
      dataSourceName: dataSource.dataSourceName,
      typeName: "Query",
      fieldName: "getThings",
      requestMappingTemplate: JSON.stringify({
        version: "2018-05-29",
        statements: ["SELECT * FROM mytable"]
      }),
      responseMappingTemplate: readFileSync(
        `${__dirname}/api/response_mappings/return_list.vtl`,
        ENC_UTF8
      )
    });
  }
}
