#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {LambdaCrudStack, LambdaCrudStackProps} from "../lib/stack/lambda-crud-stack";

const app = new cdk.App();

const props: LambdaCrudStackProps = {
    environment: "test",
    analyticsReporting: true,
    region: "eu-central-1",
    projectName: "basic-lambda-crud",
    replicationRegions: [],
    tags: {},
}

new LambdaCrudStack(app, "basic-lambda-crud-stack", props);

