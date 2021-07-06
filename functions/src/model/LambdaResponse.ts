export interface LambdaResponse {
    statusCode: number,
    headers?: {
        [key: string]: string;
    },
    isBase64Encoded: boolean,
    body: any
}
