"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_js_1 = require("crypto-js");
const node_gzip_1 = require("node-gzip");
const handler = async (event, context) => {
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
    const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
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
        uri: process.env.BUCKET_NAME + "/" + id,
        md5: crypto_js_1.MD5(doc.document).toString(),
        sha1: crypto_js_1.SHA1(doc.document).toString(),
        sha256: crypto_js_1.SHA256(doc.document).toString(),
        sha512: crypto_js_1.SHA512(doc.document).toString(),
    };
    const params = {
        TableName: process.env.TABLE_NAME,
        Item: {
            id: { S: metadata.id },
            owner: { S: metadata.owner },
            filename: { S: metadata.filename },
            uri: { S: metadata.uri },
            size: { N: metadata.size },
            content_type: { S: metadata.content_type },
            created: { N: metadata.created + "" },
            modified: { N: metadata.modified + "" },
            deleted: { BOOL: metadata.deleted },
            md5: { S: metadata.md5 },
            sha1: { S: metadata.sha1 },
            sha256: { S: metadata.sha256 },
            sha512: { S: metadata.sha512 },
        },
    };
    const command = new client_dynamodb_1.PutItemCommand(params);
    let resultDynamoDb = await client.send(command);
    const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
    //S3 storing document
    let resultS3 = await s3.send(new client_s3_1.PutObjectCommand({
        ContentEncoding: "gzip",
        Bucket: process.env.BUCKET_NAME,
        Key: metadata.id + "/content",
        Body: await node_gzip_1.gzip(JSON.stringify(doc))
    }));
    //S3 storing metadata
    let resultMetadataS3 = await s3.send(new client_s3_1.PutObjectCommand({
        ContentEncoding: "gzip",
        Bucket: process.env.BUCKET_NAME,
        Key: metadata.id + "/metadata.json",
        Body: await node_gzip_1.gzip(JSON.stringify(metadata))
    }));
    let bodyContents = `id:${metadata.id},
            document:{${JSON.stringify(resultS3)}}, 
            metadataDynamo:{${JSON.stringify(resultDynamoDb)}},
            metadataS3:{${JSON.stringify(resultMetadataS3)}}`;
    return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        isBase64Encoded: false,
        body: Buffer.from(bodyContents, 'utf8')
    };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3JlYXRlRG9jdW1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvQ3JlYXRlRG9jdW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTZGO0FBQzdGLGtEQUE4RDtBQUU5RCx5Q0FBb0Q7QUFDcEQseUNBQStCO0FBSXhCLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFFLE9BQWdCLEVBQTJCLEVBQUU7SUFHeEcsaUJBQWlCO0lBQ2IsTUFBTSxNQUFNLEdBQUcsS0FBSztRQUNoQixxQkFBcUI7UUFDckIsc0JBQXNCO1FBQ3RCLGtDQUFrQztRQUNsQyw0Q0FBNEM7UUFDNUMsNkJBQTZCO1FBQzdCLDJEQUEyRDtRQUMzRCxVQUFVO1FBQ1YsbUJBQW1CO1FBQ25CLGdEQUFnRDtRQUNoRCxTQUFTO1FBQ1QsT0FBTztRQUNQLEdBQUcsQ0FBQztJQUVSLDRCQUE0QjtJQUM1QixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUNqQixPQUFPO1lBQ0gsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRTtZQUNYLGVBQWUsRUFBRSxLQUFLO1lBQ3RCLElBQUksRUFBRSxnREFBZ0QsR0FBRyxNQUFNO1NBRWxFLENBQUM7S0FDTDtJQUNELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0lBQzFDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDYixPQUFPO1lBQ0gsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRTtZQUNYLGVBQWUsRUFBRSxLQUFLO1lBQ3RCLElBQUksRUFBRSxnREFBZ0QsR0FBRyxNQUFNO1NBQ2xFLENBQUM7S0FDTDtJQUNELElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDTixPQUFPO1lBQ0gsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFP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bnQiOlsiaW1wb3J0IHtDb250ZXh0fSBmcm9tIFwiYXdzLWxhbWJkYVwiO1xyXG5pbXBvcnQge0R5bmFtb0RCQ2xpZW50LCBQdXRJdGVtQ29tbWFuZCwgUHV0SXRlbUNvbW1hbmRJbnB1dH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1keW5hbW9kYlwiO1xyXG5pbXBvcnQge1B1dE9iamVjdENvbW1hbmQsIFMzQ2xpZW50fSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LXMzXCI7XHJcbmltcG9ydCB7QmFzaWNBcGlHYXRld2F5RXZlbnR9IGZyb20gXCIuL21vZGVsL0Jhc2ljQXBpR2F0ZXdheUV2ZW50XCI7XHJcbmltcG9ydCB7TUQ1LCBTSEExLCBTSEEyNTYsIFNIQTUxMn0gZnJvbSBcImNyeXB0by1qc1wiO1xyXG5pbXBvcnQge2d6aXB9IGZyb20gXCJub2RlLWd6aXBcIjtcclxuaW1wb3J0IHtMYW1iZGFSZXNwb25zZX0gZnJvbSBcIi4vbW9kZWwvTGFtYmRhUmVzcG9uc2VcIjtcclxuXHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQmFzaWNBcGlHYXRld2F5RXZlbnQsIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPExhbWJkYVJlc3BvbnNlPiA9PiB7XHJcblxyXG5cclxuLy8gcGF5bG9hZCBzY2hlbWFcclxuICAgIGNvbnN0IHNjaGVtYSA9IFwie1xcblwiICtcclxuICAgICAgICBcIiAgXFxcImRvY3NEYXRhXFxcIjoge1xcblwiICtcclxuICAgICAgICBcIiAgICBcXFwiaGVhZGVyc1xcXCI6IHtcXG5cIiArXHJcbiAgICAgICAgXCIgICAgICBcXFwib3duZXJcXFwiOiBcXFwic2Vub3JpY3NcXFwiLFxcblwiICtcclxuICAgICAgICBcIiAgICAgIFxcXCJmaWxlbmFtZVxcXCI6IFxcXCJteS1lcWUtZmlsZS5zaWZcXFwiLFxcblwiICtcclxuICAgICAgICBcIiAgICAgIFxcXCJzaXplXFxcIjogXFxcIjEwMjRcXFwiLFxcblwiICtcclxuICAgICAgICBcIiAgICAgIFxcXCJjb250ZW50X3R5cGVcXFwiOiBcXFwidGV4dC94LnNlbm9yaWNzLmludGVyY2hhbmdlXFxcIlxcblwiICtcclxuICAgICAgICBcIiAgICB9LFxcblwiICtcclxuICAgICAgICBcIiAgICBcXFwiYm9keVxcXCI6IHtcXG5cIiArXHJcbiAgICAgICAgXCIgICAgICBcXFwiZG9jdW1lbnRcXFwiOiBcXFwie215IGRvY3VtZW50IHZhbHVlc31cXFwiXFxuXCIgK1xyXG4gICAgICAgIFwiICAgIH1cXG5cIiArXHJcbiAgICAgICAgXCIgIH1cXG5cIiArXHJcbiAgICAgICAgXCJ9XCI7XHJcblxyXG4gICAgLy8gdmFsaWRhdGVzIHBheWxvYWQgY29udGVudFxyXG4gICAgaWYgKCFldmVudC5kb2NzRGF0YSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGJvZHk6IFwiRGF0YSBpcyBtaXNzaW5nIGZyb20gcGF5bG9hZCwgc2NoZW1hIGV4YW1wbGU6IFwiICsgc2NoZW1hXHJcblxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBjb25zdCBkb2NIZWFkZXJzID0gZXZlbnQuZG9jc0RhdGEuaGVhZGVycztcclxuICAgIGNvbnN0IGRvYyA9IGV2ZW50LmRvY3NEYXRhLmJvZHk7XHJcbiAgICBpZiAoIWRvY0hlYWRlcnMpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICBib2R5OiBcIkRvY3VtZW50IGhlYWRlcnMgYXJlIG1pc3NpbmcsIHNjaGVtYSBleGFtcGxlOiBcIiArIHNjaGVtYVxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBpZiAoIWRvYykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgICAgIGJvZHk6IFwiRG9jdW1lbnQgY29udGVudCBpcyBtaXNzaW5nLCBzY2hlbWEgZXhhbXBsZTogXCIgKyBzY2hlbWFcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7cmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OfSk7XHJcblxyXG5cclxuICAgIGxldCBpZCA9IGRvY0hlYWRlcnMuaWQgfHwgY29udGV4dC5hd3NSZXF1ZXN0SWQ7XHJcbiAgICBjb25zdCBtZXRhZGF0YSA9IHtcclxuICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgb3duZXI6IGRvY0hlYWRlcnMub3duZXIsXHJcbiAgICAgICAgZmlsZW5hbWU6IGRvY0hlYWRlcnMuZmlsZW5hbWUsXHJcbiAgICAgICAgc2l6ZTogZG9jSGVhZGVycy5zaXplLFxyXG4gICAgICAgIGNvbnRlbnRfdHlwZTogZG9jSGVhZGVycy5jb250ZW50X3R5cGUsXHJcbiAgICAgICAgY3JlYXRlZDogRGF0ZS5ub3coKSxcclxuICAgICAgICBtb2RpZmllZDogRGF0ZS5ub3coKSxcclxuICAgICAgICBkZWxldGVkOiBmYWxzZSxcclxuICAgICAgICB1cmk6IHByb2Nlc3MuZW52LkJVQ0tFVF9OQU1FICsgXCIvXCIgKyBpZCwgLy9UT0RPIGRvdWJsZSBjaGVjayBpdFxyXG4gICAgICAgIG1kNTogTUQ1KGRvYy5kb2N1bWVudCkudG9TdHJpbmcoKSxcclxuICAgICAgICBzaGExOiBTSEExKGRvYy5kb2N1bWVudCkudG9TdHJpbmcoKSxcclxuICAgICAgICBzaGEyNTY6IFNIQTI1Nihkb2MuZG9jdW1lbnQpLnRvU3RyaW5nKCksXHJcbiAgICAgICAgc2hhNTEyOiBTSEE1MTIoZG9jLmRvY3VtZW50KS50b1N0cmluZygpLFxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhcmFtczogUHV0SXRlbUNvbW1hbmRJbnB1dCA9IHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlRBQkxFX05BTUUsXHJcbiAgICAgICAgSXRlbToge1xyXG4gICAgICAgICAgICBpZDoge1M6IG1ldGFkYXRhLmlkfSxcclxuICAgICAgICAgICAgb3duZXI6IHtTOiBtZXRhZGF0YS5vd25lcn0sXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiB7UzogbWV0YWRhdGEuZmlsZW5hbWV9LFxyXG4gICAgICAgICAgICB1cmk6IHtTOiBtZXRhZGF0YS51cml9LFxyXG4gICAgICAgICAgICBzaXplOiB7TjogbWV0YWRhdGEuc2l6ZX0sXHJcbiAgICAgICAgICAgIGNvbnRlbnRfdHlwZToge1M6IG1ldGFkYXRhLmNvbnRlbnRfdHlwZX0sXHJcbiAgICAgICAgICAgIGNyZWF0ZWQ6IHtOOiBtZXRhZGF0YS5jcmVhdGVkICsgXCJcIn0sXHJcbiAgICAgICAgICAgIG1vZGlmaWVkOiB7TjogbWV0YWRhdGEubW9kaWZpZWQgKyBcIlwifSxcclxuICAgICAgICAgICAgZGVsZXRlZDoge0JPT0w6IG1ldGFkYXRhLmRlbGV0ZWR9LFxyXG4gICAgICAgICAgICBtZDU6IHtTOiBtZXRhZGF0YS5tZDV9LFxyXG4gICAgICAgICAgICBzaGExOiB7UzogbWV0YWRhdGEuc2hhMX0sXHJcbiAgICAgICAgICAgIHNoYTI1Njoge1M6IG1ldGFkYXRhLnNoYTI1Nn0sXHJcbiAgICAgICAgICAgIHNoYTUxMjoge1M6IG1ldGFkYXRhLnNoYTUxMn0sXHJcbiAgICAgICAgfSxcclxuICAgIH07XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHBhcmFtcyk7XHJcbiAgICBsZXQgcmVzdWx0RHluYW1vRGIgPSBhd2FpdCBjbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcblxyXG4gICAgY29uc3QgczMgPSBuZXcgUzNDbGllbnQoe3JlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTn0pO1xyXG4gICAgLy9TMyBzdG9yaW5nIGRvY3VtZW50XHJcbiAgICBsZXQgcmVzdWx0UzMgPSBhd2FpdCBzMy5zZW5kKG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBDb250ZW50RW5jb2Rpbmc6IFwiZ3ppcFwiLFxyXG4gICAgICAgIEJ1Y2tldDogcHJvY2Vzcy5lbnYuQlVDS0VUX05BTUUsXHJcbiAgICAgICAgS2V5OiBtZXRhZGF0YS5pZCArIFwiL2NvbnRlbnRcIixcclxuICAgICAgICBCb2R5OiBhd2FpdCBnemlwKEpTT04uc3RyaW5naWZ5KGRvYykpXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy9TMyBzdG9yaW5nIG1ldGFkYXRhXHJcbiAgICBsZXQgcmVzdWx0TWV0YWRhdGFTMyA9IGF3YWl0IHMzLnNlbmQobmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIENvbnRlbnRFbmNvZGluZzogXCJnemlwXCIsXHJcbiAgICAgICAgQnVja2V0OiBwcm9jZXNzLmVudi5CVUNLRVRfTkFNRSxcclxuICAgICAgICBLZXk6IG1ldGFkYXRhLmlkICsgXCIvbWV0YWRhdGEuanNvblwiLFxyXG4gICAgICAgIEJvZHk6IGF3YWl0IGd6aXAoSlNPTi5zdHJpbmdpZnkobWV0YWRhdGEpKVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxldCBib2R5Q29udGVudHMgPSBgaWQ6JHttZXRhZGF0YS5pZH0sXHJcbiAgICAgICAgICAgIGRvY3VtZW50Onske0pTT04uc3RyaW5naWZ5KHJlc3VsdFMzKX19LCBcclxuICAgICAgICAgICAgbWV0YWRhdGFEeW5hbW86eyR7SlNPTi5zdHJpbmdpZnkocmVzdWx0RHluYW1vRGIpfX0sXHJcbiAgICAgICAgICAgIG1ldGFkYXRhUzM6eyR7SlNPTi5zdHJpbmdpZnkocmVzdWx0TWV0YWRhdGFTMyl9fWA7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgICAgaGVhZGVyczoge1wiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifSxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIGJvZHk6IEJ1ZmZlci5mcm9tKGJvZHlDb250ZW50cywgJ3V0ZjgnKVxyXG4gICAgfVxyXG59XHJcbiJdfQ==