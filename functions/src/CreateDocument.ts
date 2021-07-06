import {Context} from "aws-lambda";
import {DynamoDBClient, PutItemCommand, PutItemCommandInput} from "@aws-sdk/client-dynamodb";
import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {BasicApiGatewayEvent} from "./model/BasicApiGatewayEvent";
import {MD5, SHA1, SHA256, SHA512} from "crypto-js";
import {gzip} from "node-gzip";
import {LambdaResponse} from "./model/LambdaResponse";


export const handler = async (event: BasicApiGatewayEvent, context: Context): Promise<LambdaResponse> => {


// payload schema
    const schema = "{\n" +
        "  \"docsData\": {\n" +
        "    \"headers\": {\n" +
        "      \"owner\": \"senorics\",\n" +
        "      \"filename\": \"my-eqe-file.sif\",\n" +
        "      \"size\": \"1024\",\n" +
        "      \"content_type\": \"text/x.senorics.interchange\"\n" +
        "    },\n" +
        "    \"body\": {\n" +
        "      \"document\": \"{my document values}\"\n" +
        "    }\n" +
        "  }\n" +
        "}";

    // validates payload content
    if (!event.docsData) {
        return {
            statusCode: 400,
            headers: {},
            isBase64Encoded: false,
            body: "Data is missing from payload, schema example: " + schema

        };
    }
    const docHeaders = event.docsData.headers;
    const doc = event.docsData.body;
    if (!docHeaders) {
        return {
            statusCode: 400,
            headers: {},
            isBase64Encoded: false,
            body: "Document headers are missing, schema example: " + schema
        };
    }
    if (!doc) {
        return {
            statusCode: 400,
            headers: {},
            isBase64Encoded: false,
            body: "Document content is missing, schema example: " + schema
        };
    }

    const client = new DynamoDBClient({region: process.env.AWS_REGION});


    let id = docHeaders.id || context.awsRequestId;
    const metadata = {
        id: id,
        owner: docHeaders.owner,
        filename: docHeaders.filename,
        size: docHeaders.size,
        content_type: docHeaders.content_type,
        created: Date.now(),
        modified: Date.now(),
        deleted: false,
        uri: process.env.BUCKET_NAME + "/" + id, //TODO double check it
        md5: MD5(doc.document).toString(),
        sha1: SHA1(doc.document).toString(),
        sha256: SHA256(doc.document).toString(),
        sha512: SHA512(doc.document).toString(),
    }

    const params: PutItemCommandInput = {
        TableName: process.env.TABLE_NAME,
        Item: {
            id: {S: metadata.id},
            owner: {S: metadata.owner},
            filename: {S: metadata.filename},
            uri: {S: metadata.uri},
            size: {N: metadata.size},
            content_type: {S: metadata.content_type},
            created: {N: metadata.created + ""},
            modified: {N: metadata.modified + ""},
            deleted: {BOOL: metadata.deleted},
            md5: {S: metadata.md5},
            sha1: {S: metadata.sha1},
            sha256: {S: metadata.sha256},
            sha512: {S: metadata.sha512},
        },
    };
    const command = new PutItemCommand(params);
    let resultDynamoDb = await client.send(command);


    const s3 = new S3Client({region: process.env.AWS_REGION});
    //S3 storing document
    let resultS3 = await s3.send(new PutObjectCommand({
        ContentEncoding: "gzip",
        Bucket: process.env.BUCKET_NAME,
        Key: metadata.id + "/content",
        Body: await gzip(JSON.stringify(doc))
    }));

    //S3 storing metadata
    let resultMetadataS3 = await s3.send(new PutObjectCommand({
        ContentEncoding: "gzip",
        Bucket: process.env.BUCKET_NAME,
        Key: metadata.id + "/metadata.json",
        Body: await gzip(JSON.stringify(metadata))
    }));

    let bodyContents = `id:${metadata.id},
            document:{${JSON.stringify(resultS3)}}, 
            metadataDynamo:{${JSON.stringify(resultDynamoDb)}},
            metadataS3:{${JSON.stringify(resultMetadataS3)}}`;

    return {
        statusCode: 201,
        headers: {"Content-Type": "application/json"},
        isBase64Encoded: false,
        body: Buffer.from(bodyContents, 'utf8')
    }
}
