#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { AppsyncStack } from '../lib/appsync-stack';

const app = new cdk.App();
new AppsyncStack(app, 'AppsyncStack');
