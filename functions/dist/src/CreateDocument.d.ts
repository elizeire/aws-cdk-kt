import { Context } from "aws-lambda";
import { BasicApiGatewayEvent } from "./model/BasicApiGatewayEvent";
import { LambdaResponse } from "./model/LambdaResponse";
export declare const handler: (event: BasicApiGatewayEvent, context: Context) => Promise<LambdaResponse>;
