import {Construct, NestedStack, NestedStackProps, RemovalPolicy} from "@aws-cdk/core";
import {BasicLambdaFunction, BasicLambdaFunctionProps} from "../lambda/basic-lambda";
import {BlockPublicAccess, Bucket, BucketAccessControl, BucketEncryption} from "@aws-cdk/aws-s3";
import {AttributeType, BillingMode, StreamViewType, Table, TableEncryption} from "@aws-cdk/aws-dynamodb";


export interface LambdaCrudStackProps extends NestedStackProps {
    environment: string,
    analyticsReporting: boolean,
    region: string,
    projectName: string,
    replicationRegions: string[],
    tags: {},
}

/**
 * CRUD Stack
 *
 * The main construct
 *
 * * @author guilherme.elizeire
 */
export class LambdaCrudStack extends NestedStack {

    constructor(scope: Construct, id: string, props: LambdaCrudStackProps) {
        super(scope, id);

        const documentType = 'doctype';

        const lambdaProps: BasicLambdaFunctionProps = {
            projectName: props.projectName,
            documentType: documentType,
        }


        let bucket = new Bucket(this, `s3-${documentType}`, {
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
            publicReadAccess: false,
            encryption: BucketEncryption.S3_MANAGED,// Server-side encryption with a master key managed by S3.
            bucketName: props.projectName + "-" + documentType,
            removalPolicy: RemovalPolicy.RETAIN,
            versioned: true,
            // serverAccessLogsBucket: accessLogBucket,
            // serverAccessLogsPrefix: `${bucketName}`,
        });

        let table = new Table(this, `dynamodb-${documentType}`, {
            tableName: props.projectName + "-" + documentType,
            partitionKey: {name: 'id', type: AttributeType.STRING},
            sortKey: {name: 'created', type: AttributeType.NUMBER},
            encryption: TableEncryption.DEFAULT,
            billingMode: BillingMode.PAY_PER_REQUEST,
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
            replicationRegions: props.replicationRegions
        });


        const LambdaAppStack = new BasicLambdaFunction(this, 'basic-crud-lambda-eqe',
            bucket, table,
            lambdaProps);


    }
}
