import { OpenRPC } from "@open-rpc/meta-schema";
import { Server, IServerOptions } from "@open-rpc/server-js";
export type TestProtocol = "ws" | "http";

export const testServer = (port: number, protocol: TestProtocol, openrpcDocument: OpenRPC, opts: any) => {

  let options = {} as IServerOptions;

  let transportConfigs;
  switch ( protocol) {
    case "ws":
    transportConfigs = [
      {
        options: {
          middleware: [],
          port,
        },
        type: "WebSocketTransport",
      },
    ];
    break;
    case "http":
    transportConfigs = [
      {
        options: {
          middleware: [],
          port,
        },
        type: "HTTPTransport",
      },
    ];
    break;
  }
  options = {
    methodMapping: { mockMode: true },
    openrpcDocument,
    transportConfigs,
  } as IServerOptions;
  return new Server(options);
};
