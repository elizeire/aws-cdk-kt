import {APIGatewayProxyEvent} from "aws-lambda";
import {GetObjectCommand, GetObjectCommandOutput, S3Client} from "@aws-sdk/client-s3";
import ReadableStream = NodeJS.ReadableStream;
import {LambdaResponse} from "./model/LambdaResponse";

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<LambdaResponse> => {

    const s3 = new S3Client({region: process.env.AWS_REGION});
    if (!event.pathParameters || !event.pathParameters.id) {
        return {
            statusCode: 400,
            headers: {},
            isBase64Encoded:false,
            body: "Data is missing from payload, schema: {pathParameters:{id:string}}"
        }
    }

    const command = new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME, Key: event.pathParameters.id
    })

    // Create a helper function to convert a ReadableStream to a string.
    const streamToByteArray = (stream:ReadableStream) =>
        new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks)));
        });

    const data: GetObjectCommandOutput = await s3.send(command);

    const bodyContents = await streamToByteArray(data.Body);


    return {
        statusCode: 200,
        headers: {"Content-Encoding": "gzip"},
        isBase64Encoded: true,
        body: bodyContents
    }

}
