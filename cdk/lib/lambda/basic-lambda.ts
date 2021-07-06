import cdk = require('@aws-cdk/core');
import {CfnOutput,} from "@aws-cdk/core";
import {Code, Function, LayerVersion, Runtime} from "@aws-cdk/aws-lambda";
import {Effect, Policy, PolicyStatement, Role, ServicePrincipal} from "@aws-cdk/aws-iam";
import {Bucket} from "@aws-cdk/aws-s3";
import {Table} from "@aws-cdk/aws-dynamodb";

const path = require('path');

export interface BasicLambdaFunctionProps {
    projectName: string,
    documentType: string,
}

/**
 * CRUD lambda function
 *
 * * @author guilherme.elizeire
 */
export class BasicLambdaFunction extends cdk.Construct {

    public readonly functionCreateDocument: Function;
    public readonly functionGetDocument: Function;


    constructor(scope: cdk.Construct, id: string, bucket: Bucket, table: Table, props: BasicLambdaFunctionProps) {
        super(scope, id);
        // create single Role for this document type
        const role = new Role(this, `Lambda-${props.documentType}`, {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        });

        // create lambda layers
        const {awsClientsLayer, commonsLayer} = this.createLambdaLayers();

        // create lambda functions
        this.functionCreateDocument = this.createFnCreateDocument(props, role, table, bucket, awsClientsLayer, commonsLayer);
        this.functionGetDocument = this.createFnGetDocument(props, role, bucket, awsClientsLayer, commonsLayer);

        this.createPolicies(role, table, bucket);

        new CfnOutput(this, 'functionCreateDocumentName', {value: this.functionCreateDocument.functionName});
        new CfnOutput(this, 'functionCreateDocumentArn', {value: this.functionCreateDocument.functionArn});
        new CfnOutput(this, 'functionGetDocumentName', {value: this.functionGetDocument.functionName});
        new CfnOutput(this, 'functionGetDocumentArn', {value: this.functionGetDocument.functionArn});
    }

    private createLambdaLayers() {

        const awsClientsLayer = new LayerVersion(this, 'awsClientsLayer', {
            code: Code.fromAsset('../layers/aws-clients'),
            compatibleRuntimes: [Runtime.NODEJS_12_X],
            license: 'ISC',
            description: 'A layer that contains client-dynamodb and client-s3 dependencies',
        });

        const commonsLayer = new LayerVersion(this, 'commonsLayer', {
            code: Code.fromAsset('../layers/commons'),
            compatibleRuntimes: [Runtime.NODEJS_12_X],
            license: 'ISC',
            description: 'A layer that contains get-stream, crypto and node-gzip dependencies',
        });
        return {
            awsClientsLayer: awsClientsLayer,
            commonsLayer: commonsLayer
        };
    }


    private createFnCreateDocument(props: BasicLambdaFunctionProps, role: Role, table: Table, bucket: Bucket, awsClientsLayer: LayerVersion, awsCommonsLayer: LayerVersion) {
        let createDocumentFn = new Function(this, 'FunctionCreateDocument', {
            functionName: `${props.projectName}-${props.documentType}-CreateDocument`,
            runtime: Runtime.NODEJS_12_X,
            description: `Create document Generated on: ${new Date().toISOString()}`,
            handler: 'CreateDocument.handler',
            memorySize: 128,
            // timeout: Duration.seconds(120),
            role: role,
            environment: {
                TABLE_NAME: table.tableName,
                BUCKET_NAME: bucket.bucketName
            },
            code: Code.fromAsset(path.dirname('../functions/dist/src/CreateDocument.js')),
            layers: [awsClientsLayer, awsCommonsLayer]
        });
        createDocumentFn.currentVersion.addAlias('current')
        table.grantWriteData(createDocumentFn);
        bucket.grantReadWrite(createDocumentFn);
        return createDocumentFn;
    }

    private createFnGetDocument(props: BasicLambdaFunctionProps, role: Role, bucket: Bucket, awsClientsLayer: LayerVersion, awsCommonsLayer: LayerVersion) {
        let getDocumentFn = new Function(this, 'FunctionGetDocument', {
            functionName: `${props.projectName}-${props.documentType}-GetDocument`,
            runtime: Runtime.NODEJS_12_X,
            description: `Get a document Generated on: ${new Date().toISOString()}`,
            handler: 'GetDocument.handler',
            memorySize: 128,
            // timeout: Duration.seconds(120),
            role: role,
            environment: {
                BUCKET_NAME: bucket.bucketName
            },
            code: Code.fromAsset(path.dirname('../functions/dist/src/GetDocument.js')),
            layers: [awsClientsLayer, awsCommonsLayer]
        });
        getDocumentFn.currentVersion.addAlias('current')
        bucket.grantReadWrite(getDocumentFn);
        return getDocumentFn;
    }


    private createPolicies(role: Role, table: Table, bucket: Bucket) {
        //Common Police for all functions, DocsEqeLambdaRole
        new Policy(this, "DocsEqeLambdaPolicy", {
            policyName: "DocsEqeLambdaPolicy",
            roles: [role],
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 's3:PutObject', 's3:GetObject', 's3:ListBucket', 's3:GetObjectVersionTagging'],
                    resources: [table.tableArn, bucket.bucketArn],
                }),
                new PolicyStatement({
                    effect: Effect.DENY,
                    actions: ['dynamodb:DeleteItem'],
                    resources: [table.tableArn, bucket.bucketArn],
                })
            ]
        });
    }


}
