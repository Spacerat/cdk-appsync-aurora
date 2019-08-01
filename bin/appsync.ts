#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { DBStack } from "../lib/db-stack";
import { VPCStack } from "../lib/vpc-stack";
import { AppSyncStack } from "../lib/appsync-stack";

const app = new cdk.App();

const vpc = new VPCStack(app, "VPC");
const db = new DBStack(app, "DB", { vpc: vpc.vpc });

const appsync = new AppSyncStack(app, "AppSync", {
  dbConfig: {
    awsRegion: db.region,
    awsSecretStoreArn: db.db.secret.secretArn,
    databaseName: "testdb",
    clusterArn: db.db.clusterArn
  }
});
