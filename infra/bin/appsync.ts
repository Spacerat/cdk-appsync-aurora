#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { DBStack } from "../lib/db-stack";
import { VPCStack } from "../lib/vpc-stack";
import { AppSyncStack } from "../lib/appsync-stack";
import { MigrationStack } from "../lib/migration-stack";

const app = new cdk.App();

const vpc = new VPCStack(app, "VPC");
const db = new DBStack(app, "DB", { vpc: vpc.vpc });

const dbConfig = {
  awsRegion: db.db.region,
  dbSecret: db.db.secret,
  clusterArn: db.db.clusterArn,
  databaseName: "testdb"
};

// const migrations = new MigrationStack(app, "Migrations", {
//   dbConfig: dbConfig
// });

const appsync = new AppSyncStack(app, "AppSync", {
  dbConfig: dbConfig
});
