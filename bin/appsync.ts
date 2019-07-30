#!/usr/bin/env node
import "source-map-support/register";
import cdk = require("@aws-cdk/core");
import { DBStack } from "../lib/db-stack";
import { VPCStack } from "../lib/vpc-stack";

const app = new cdk.App();

const vpc = new VPCStack(app, "VPC");
const db = new DBStack(app, "DB", { vpc: vpc.vpc });
