import { APIGatewayEvent } from "aws-lambda";
export interface BasicApiGatewayEvent extends APIGatewayEvent {
    docsData: DocsData;
}
export interface DocsData {
    headers: DocsHeaders;
    body: DocsBody;
}
export interface DocsHeaders {
    id: string;
    modified: string;
    owner: string;
    filename: string;
    size: string;
    content_type: string;
}
export interface DocsBody {
    document: any;
}
