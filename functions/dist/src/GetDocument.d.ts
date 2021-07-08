import { APIGatewayProxyEvent } from "aws-lambda";
import { LambdaResponse } from "./model/LambdaResponse";
export declare const handler: (event: APIGatewayProxyEvent) => Promise<LambdaResponse>;
