/**
 * Contains error handling and error code mapping for commong json rpc errors
 */
export const PARSE_ERROR_CODE = -32700;
export const INVALID_REQUEST_CODE = -32600;
export const METHOD_NOT_FOUND_CODE = -32601;
export const INVALID_PARAMS_CODE = -32602;
export const INTERNAL_SERVER_CODE = -32603;
export const GATEWAY_ERROR_CODE = -32098;
export const SERVICE_NOT_FOUND_CODE = -32099;

export const PARSE_ERROR = "Parse Error";
export const INVALID_REQUEST = "Invalid Request";
export const METHOD_NOT_FOUND = "Method not found";
export const INVALID_PARAMS = "Invalid Params";
export const INTERNAL_SERVER = "Internal Server Error";
export const GATEWAY_ERROR = "Gateway Failure";
export const SERVICE_NOT_FOUND = "Service not found";

const errorMap = new Map([
  [PARSE_ERROR, PARSE_ERROR_CODE],
  [INVALID_REQUEST, INVALID_REQUEST_CODE],
  [METHOD_NOT_FOUND, METHOD_NOT_FOUND_CODE],
  [INVALID_PARAMS, INVALID_PARAMS_CODE],
  [INTERNAL_SERVER, INTERNAL_SERVER_CODE],
  [GATEWAY_ERROR, GATEWAY_ERROR_CODE],
  [SERVICE_NOT_FOUND, SERVICE_NOT_FOUND_CODE],
]);
const httpStatusCodeMap = new Map([
  [METHOD_NOT_FOUND_CODE, 404],
  [INVALID_REQUEST_CODE, 400],
  [INTERNAL_SERVER_CODE, 500],
  [GATEWAY_ERROR_CODE, 504],
  [INVALID_PARAMS_CODE, 500],
  [PARSE_ERROR_CODE, 500],
]);

export interface JSONRpcError {
  id: number;
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data: any;
  };
}

export const statusCode = (code: number): number => {
  return httpStatusCodeMap.get(code) || 500;
};

export const error = (message: string, id: number, data: any): JSONRpcError => {
  let msg = message;
  let code = errorMap.get(message);
  if (code === undefined) {
    code = -32000;
    msg = "Unknown Error";
  }
  return {
    id, jsonrpc: "2.0", error: { code, message: msg, data },
  };
};
